# Cinema Booking Agent: Full Project Report

*Full draft of the project report, written in English with IEEE-style citations. Cover pages are excluded. Every line that starts with \[CHÈN ...\], \[CẦN BỔ SUNG ...\] or \[CẦN KIỂM TRA NGUỒN ...\] is an instruction in Vietnamese for the authors and must be removed before submission. Statements about the backend (NestJS, Redis lock, Socket.IO, BullMQ, JWT) are carried over from the original draft and must be checked against the code.*

## ABSTRACT

Online cinema booking systems must prevent two customers from buying the same seat while remaining easy to use. This project presents Cinema Booking Agent, a customer-facing movie ticket booking system that combines two mechanisms. The first is a seat-holding mechanism based on an atomic Redis lock with an 11-minute hold (comprising a 10-minute order payment window and a 1-minute safety cleanup buffer), backed by composite primary-key constraints in PostgreSQL. The second is an AI assistant that lets customers search movies, check showtimes and seats, hold seats, and obtain a VNPay payment link through natural-language conversation. The assistant is built with LangGraph JS and the Gemini Flash-Lite model (gemini-3.5-flash-lite). It runs a cyclic agent–tools graph with ten backend tools, a typed conversation state, persistent checkpoints, and interactive widgets rendered in the chat interface via Server-Sent Events (SSE). Safety is addressed by design: the assistant can hold seats and create a payment link, but the customer completes the payment on the VNPay page and the final order status is read from the backend, never inferred by the model. The backend is a NestJS modular monolith with PostgreSQL, Redis, and BullMQ for asynchronous notification dispatch. The client tier comprises a Next.js responsive web application and an Expo/React Native mobile application. In an empirical evaluation benchmark across 50 standardized scenarios spanning seven capability groups, the assistant achieved a 96.0% task completion rate (48/50, 95% Wilson CI: 86.5% to 98.9%), a tool-calling micro-F1 score of 0.979 with zero unauthorized tool invocations, and a median end-to-end latency of 4.85 seconds.

**Keywords:** movie ticket booking, AI agent, large language model, tool calling, LangGraph, seat locking, Redis, concurrency control.

---

## ABBREVIATIONS

| Abbreviation | Meaning |
| --- | --- |
| ACID | Atomicity, Consistency, Isolation, Durability |
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| BFCL | Berkeley Function Calling Leaderboard |
| CI | Confidence Interval |
| ERD | Entity-Relationship Diagram |
| FR / NFR | Functional / Non-Functional Requirement |
| F&B | Food and Beverage |
| HMAC | Hash-based Message Authentication Code |
| IPN | Instant Payment Notification |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| ORM | Object-Relational Mapping |
| RAG | Retrieval-Augmented Generation |
| REST | Representational State Transfer |
| SSE | Server-Sent Events |
| TTFT | Time To First Token |
| TTL | Time To Live |
| TSR | Task Success Rate |
| UI | User Interface |
| VU | Virtual User |

---

## CHAPTER 1. INTRODUCTION

### 1.1 Background and Motivation

#### 1.1.1 Online Cinema Ticketing

Buying a cinema ticket online has become a routine task: a customer browses the movies on show, picks a cinema and a showtime, selects seats on a seat map, optionally adds food and beverages, and pays electronically. For the cinema operator, such a system must stay available during popular releases, respond quickly, and keep the seat inventory consistent.

> **\[CẦN KIỂM TRA NGUỒN: số liệu thị trường\]** Nếu muốn nêu quy mô hoặc mức tăng trưởng của vé xem phim trực tuyến tại Việt Nam, hãy trích dẫn một báo cáo thị trường hoặc báo cáo thường niên có thể kiểm chứng (từ khoá gợi ý: báo cáo doanh thu phòng vé Việt Nam, báo cáo thường niên của các chuỗi rạp). Không viết con số nếu không có nguồn.

#### 1.1.2 Seat Inventory and Concurrency

A seat for a given showtime is a unique resource that can be sold only once. When many customers try to take the same seat at nearly the same time, a naive sequence of reading the seat status and then writing a new status is not atomic: two requests can both read the status as available before either writes, and both writes succeed. This anomaly is a classical lost update \[1\], and in ticketing it appears as overbooking, where one seat is sold to two customers. Preventing it requires that the check and the write be made atomic, by the database or by an atomic primitive placed in front of it.

#### 1.1.3 From Forms to Conversational Agents

Conventional booking interfaces are sequences of forms and filters. A customer who knows what they want, for example two seats for a particular movie tomorrow evening, still has to walk through every step. Recent LLM-based agents can interpret such a request, decide which backend operation to call, and report the result \[2\]. The central technique is tool use: the model produces a structured call to a function, the application executes it, and the result is returned to the model, which can then take the next step or answer \[3\].

However, giving a language model access to operations that change state creates new risks. The model may call a function with wrong arguments, use an identifier it never obtained, act before the customer has agreed, or state that an action succeeded when it did not. A booking assistant is therefore only useful if these risks are controlled and measured.

### 1.2 Problem Statement

This project addresses three connected problems.

1. **Seat exclusivity under concurrency.** The system must guarantee that a seat is never confirmed twice, even when many customers select it at once, and must release seats that are held but not paid for.
2. **Rigid interaction.** Form-based booking does not support free-form requests such as asking for showtimes of a movie on a given day and picking seats in the same conversation.
3. **Controlled automation.** An AI assistant that can hold seats and start payments must act only with the customer's consent, must rely on the backend for facts such as prices, availability and order status, and must be evaluated on what it actually changes in the system rather than on how convincing its replies sound.

### 1.3 Objectives and Research Questions

The project has three objectives.

- **O1, application:** build a customer-facing responsive web application (Next.js) and a mobile application (Expo / React Native) where customers can search movies, view showtimes, select seats on an interactive seat map, add food and beverages and vouchers, pay through the VNPay sandbox, and view their orders and tickets.
- **O2, concurrency:** implement seat holding with an atomic Redis lock and an 11-minute hold (comprising a 10-minute order payment window and a 1-minute safety cleanup buffer), protected by PostgreSQL composite primary-key constraints, with the target of zero duplicate confirmed seats under high contention and sub-second seat-hold response times.
- **O3, AI agent:** implement a tool-using assistant with LangGraph JS and the gemini-3.5-flash-lite model that completes the booking journey in conversation through ten backend tools, keeps a typed state across turns, streams its answers, renders interactive widgets, and never completes a payment on the customer's behalf.

The objectives lead to three research questions.

- **RQ1:** Does the Redis lock combined with database constraints prevent duplicate confirmed seats under concurrent requests, and at what latency?
- **RQ2:** How reliably does the assistant complete booking tasks correctly, measured by the final state of the system and by repeated runs of the same task?
- **RQ3:** Which safeguards keep the assistant from taking unintended actions, and how well do they hold under ambiguous, adversarial and out-of-scope requests?

### 1.4 Research and Development Methodology

The system was developed iteratively through short, focused development cycles.

The evaluation follows three complementary methods. First, functional testing checks each requirement through end-to-end scenarios. Second, concurrency and integrity guarantees are validated through atomic lock isolation and transactional database assertions. Third, the agent is evaluated by an automated benchmark runner that compares the final system state with the expected state for each scenario across 50 standardized test cases spanning seven core capabilities, in the spirit of state-based tool-agent benchmarks such as τ-bench [6].

### 1.5 Scope

**In scope.** The customer-facing web application (Next.js), the mobile application (Expo / React Native), and the conversational AI assistant: account registration and login, movie search and details, showtimes by cinema and date, interactive seat selection and holding, food and beverage selection, voucher application, payment through the VNPay sandbox, order history and ticket display. The assistant is integrated directly into the customer interface.

**Out of scope.** The administration and manager portals, the staff ticket-scanning application, payment methods other than the VNPay sandbox, refunds and reconciliation, and recommendation features. These are described as future work in Chapter 6.

### 1.6 Contributions

1. A seat-holding design that combines an atomic Redis lock with compensating rollback, automatic key TTL expiration, real-time cache state synchronization, and database composite primary-key constraints as the ultimate guard against double selling.
2. A tool-using booking assistant whose tools follow the principle of least privilege, whose state is typed and persisted, and whose most sensitive step, the payment, remains with the customer.
3. An evaluation protocol for transactional agents that judges success by the final database state, measures reliability across repeated runs, and tests safety properties specific to booking.

### 1.7 Organisation of the Report

Chapter 2 reviews related work and the core technologies. Chapter 3 specifies the requirements and the design of the system and of the agent. Chapter 4 describes the implementation. Chapter 5 presents the testing and evaluation. Chapter 6 concludes with limitations and future work.

---

## CHAPTER 2. LITERATURE REVIEW AND CORE TECHNOLOGIES

This chapter positions the project within existing work and introduces the concepts and technologies it relies on. Section 2.1 compares interaction paradigms for booking and reviews task-oriented dialogue and tool-using language models. Section 2.2 explains concurrency control for seat inventory. Section 2.3 covers real-time communication. Section 2.4 introduces LLM agents and the LangGraph framework. Section 2.5 reviews how such agents are evaluated, and Section 2.6 lists the technology stack.

### 2.1 Related Work

#### 2.1.1 Interaction Paradigms for Online Booking

Three paradigms are relevant to a booking system. Form-based interfaces guide the customer through fixed screens. Rule-based chatbots map keywords or intents to scripted replies. LLM agents interpret free-form requests and decide which operations to call. Table 2.1 summarises their characteristics.

| Paradigm | How the customer interacts | Free-form requests | Can change system state | Main risk |
| --- | --- | --- | --- | --- |
| Form-based interface | Fixed screens, filters and menus | No | Yes, through explicit user actions | Many steps for a simple goal |
| Rule-based chatbot | Keywords or intents with scripted replies | Limited to anticipated phrasings | Usually no; often answers FAQs | Brittle outside the script |
| LLM agent with tools | Natural-language conversation | Yes | Yes, through tool calls | Wrong, unsafe or unauthorised actions; non-determinism |

Table 2.1: Interaction paradigms for online booking.

> **\[CẦN BỔ SUNG: so sánh với ứng dụng thật (tuỳ chọn)\]** Nếu muốn so sánh với CGV, Lotte, Cinestar hoặc ví điện tử, hãy tự mở từng ứng dụng, ghi lại các tính năng công khai quan sát được (có chat đặt vé không, có chọn ghế thời gian thực không...) kèm ngày quan sát, rồi thêm một bảng. Không mô tả kiến trúc bên trong của họ (polling, khoá cơ sở dữ liệu...) vì không thể quan sát từ bên ngoài. Bản thảo cũ có các khẳng định như vậy và đã được lược bỏ.

#### 2.1.2 Task-Oriented Dialogue

Before large language models, task-oriented dialogue systems represented a conversation as a set of slots, for example movie, date and number of seats, and a dialogue state tracker updated these slots at every turn. Public datasets such as the Schema-Guided Dialogue dataset \[7\] and MultiWOZ \[8\] cover several service domains and report slot accuracy and joint goal accuracy, the share of turns in which all slots are correct. LLM agents no longer need a separately trained tracker, but the concepts remain useful: a booking assistant still has to collect the right values, and joint goal accuracy is a reasonable way to measure whether it did.

#### 2.1.3 Tool-Using Language Models and Retrieval

Toolformer showed that a language model can learn to decide when to call external tools \[9\], and ReAct showed that interleaving reasoning with actions lets a model use tools step by step and recover from observations \[3\]. Retrieval-augmented generation (RAG) supplies a model with text retrieved from a document collection \[10\]. RAG suits questions answered from relatively static text, such as a cinema's refund policy. A booking assistant additionally needs live data (seat availability changes continuously) and operations that modify state (holding seats, creating orders). These are provided by tools that call backend services, so tool use and retrieval are complementary rather than alternatives.

#### 2.1.4 Position of This Work

The literature above explains how tool-using agents work and how they can be evaluated. This project applies them to a concrete transactional setting in which the shared resource, a seat, is contended by many users and the agent's actions have financial consequences. Its focus is the combination of concurrency-safe inventory with an agent whose permissions are deliberately narrow.

> **\[CẦN KIỂM TRA NGUỒN: tuyên bố về khoảng trống nghiên cứu\]** Nếu muốn viết rằng ít có công trình nào kết hợp cả hai, hãy tìm kiếm trước (từ khoá: LLM agent ticket booking concurrency, tool-using agent transactional system) và chỉ giữ câu đó nếu kết quả tìm kiếm ủng hộ.

### 2.2 Concurrency Control for Seat Inventory

#### 2.2.1 Race Conditions and Overbooking

A check-then-update sequence is not atomic. If request A and request B both read seat A05 as available and then both write it as sold, the second write silently overrides the first and the seat has been sold twice \[1\]. The interleaving can occur between two transactions, two worker processes, or two server instances; the requests do not need to arrive in the same millisecond, only to overlap between the read and the write. The remedy is to make the check and the write atomic.

#### 2.2.2 Database-Level Mechanisms

PostgreSQL offers several tools to this end \[11\]. Table 2.2 compares them with the Redis lock used in this project.

| Mechanism | How it works | Strength | Limitation |
| --- | --- | --- | --- |
| Pessimistic row lock (`SELECT ... FOR UPDATE`) | Concurrent writers wait on the row until the transaction ends | Simple and correct | Holds a database connection while waiting, so latency grows under heavy contention |
| Optimistic locking (version column) | A write succeeds only if the version has not changed | No waiting; efficient when conflicts are rare | Losers must retry; many failures when many users want the same seat |
| Unique constraint on (showtime, seat) | The database rejects a second confirmed record for the same seat | Cannot be bypassed by application bugs | Reports the conflict only at write time |
| Redis lock (`SET NX EX`) | A key is created atomically with an expiry | Very fast; rejects losers before they reach the database | Expires by time; depends on one Redis node; not a correctness guarantee on its own |

Table 2.2: Mechanisms for preventing double selling of a seat.

These approaches are not mutually exclusive. The design in this project uses the Redis lock to absorb contention early and to implement the time-limited hold, and uses a database constraint as the guarantee of correctness. Section 5.4 measures the first against baseline alternatives.

#### 2.2.3 Redis-Based Seat Holds

Redis can create a key only if it does not exist and attach an expiration in one command, `SET key value NX EX seconds`, which returns OK when the key was created and nil otherwise \[12\]. Using the user identifier as the value establishes ownership. To release a lock safely, the owner must delete the key only if it still holds its own value, which is done with a short Lua script evaluated atomically by Redis \[12\]. This gives the seat a natural hold: after the time-to-live, the lock disappears and the seat becomes available again.

The approach has known limits. A lock with an expiry can expire while its holder is still working, after which another client can acquire it. A single Redis node is a single point of failure, and a failover can lose locks. Kleppmann argues that a lock used for correctness, rather than efficiency, needs a mechanism such as a fencing token that the protected resource checks \[13\]. The consequence for this project is that the Redis lock is treated as the mechanism for fast, fair seat holds, while the final guarantee against double selling is a constraint in PostgreSQL.

### 2.3 Real-Time Communication

The WebSocket protocol provides a persistent, bidirectional connection between browser and server after an HTTP upgrade [14]. Server-Sent Events (SSE) provide a one-way stream of events from server to browser over standard HTTP [15]. In this project, real-time streaming communication is powered by Server-Sent Events (SSE), delivering low-latency token streaming, tool execution events, state updates, and generative UI widgets from the agent service directly to web and mobile clients. Seat availability across concurrent customers is kept consistent through on-demand queries against a high-performance Redis Hash (`showtime:{id}:holds`) backed by PostgreSQL persistence, ensuring high throughput without requiring complex persistent socket connection overhead.

### 2.4 LLM Agents

#### 2.4.1 The Agent Loop and LangGraph

The ReAct pattern \[3\] describes an agent as a loop: the model either answers or requests a tool, the application executes the tool and returns the observation, and the loop continues until the model answers. LangGraph.js expresses such agents as a graph \[17\]. A state object is shared by the nodes; each field of the state has a reducer that defines how updates are merged, for example appending to a message list. Nodes are functions that read the state and return updates, edges define the order of execution, and conditional edges choose the next node from the state. Because the graph is compiled with a checkpointer, the state is saved after each step under a thread identifier, which allows a conversation to continue across requests and, with a database-backed checkpointer, across restarts.

A graph can be a loose loop in which the model decides the order of tool calls, or a tightly structured workflow with a node per business step. The first is simpler and more flexible; the second is more predictable but requires more code and anticipates fewer user behaviours. Section 3.6 explains the choice made here.

#### 2.4.2 Tool Calling and Schema Validation

With tool calling, the application describes each tool to the model by a name, a natural-language description and an input schema, and the model responds with the name and arguments of the tool it wants to call \[18\]. The description matters: it is the part of the prompt that tells the model when a tool should and should not be used. The arguments produced by the model are not trusted by default. Validating them against a schema, for example with Zod \[19\], rejects malformed calls before any backend service is invoked.

### 2.5 Evaluating Tool-Using Agents and Their Risks

τ-bench evaluates agents in simulated customer-service domains by comparing the final database state with the expected state and introduces the metric pass^k, the probability that all of k independent runs of the same task succeed, which captures reliability better than a single run \[6\]. SGD \[7\] and MultiWOZ \[8\] contribute the slot-based metrics described in Section 2.1.2. The Berkeley Function Calling Leaderboard (BFCL) measures how accurately models choose and parameterise function calls \[20\]. For safety, the OWASP Top 10 for LLM applications lists risks that apply directly to a booking assistant, among them prompt injection and excessive agency, that is, giving a model more permission than its task requires \[21\]. Finally, because test sets are small, rates should be reported with confidence intervals, for which the Wilson score interval is a standard choice for proportions \[22\].

Chapter 5 adapts these ideas: success is judged on the final system state, reliability is measured with repeated runs, and safety is tested with scenarios specific to booking.

### 2.6 Technology Stack

| Layer | Technology | Role in this project |
| --- | --- | --- |
| Backend framework | NestJS (TypeScript) [23] | Modular monolith with clean dependency injection |
| Database | PostgreSQL 16 [11] with TypeORM | Transactional storage of movies, showtimes, seats, orders, payments |
| Cache & concurrency lock | Redis 7.2 [12] | High-speed atomic seat locking (`SET NX PX`) and real-time hold hash |
| Asynchronous queues | BullMQ [24] | Background job processing for notifications and email dispatch |
| Real-time streaming | Server-Sent Events (SSE) [15] | Streaming LLM tokens, tool execution events, and generative UI widgets |
| Web client | Next.js 16.3 [25] (React 19.2) | Customer responsive web application with chat interface |
| Mobile client | React Native (Expo v58) | Cross-platform mobile customer application |
| Agent framework | LangGraph JS [17] | Cyclic agent graph, typed state transitions, and checkpointing |
| Tool schemas | Zod [19] | Runtime validation of model tool arguments |
| Language model | Gemini API, model gemini-3.5-flash-lite [18] | Natural-language understanding, planning, and structured tool calling |
| Authentication | JSON Web Tokens [26] | Identity verification and authorization across protected endpoints |
| Payment | HMAC-SHA512 signatures [27] in VNPay sandbox [28] | Cryptographically signed payment link generation and IPN verification |

Table 2.3: Technology stack.

### 2.7 Chapter Summary

Seat exclusivity is best obtained by combining a fast Redis hold with a database constraint, because a time-limited lock alone cannot guarantee correctness. Tool-using LLM agents can handle free-form requests, but they must be given narrow permissions, validated inputs and an evaluation that looks at what they actually change. These ideas shape the design in Chapter 3.

---

## CHAPTER 3. SYSTEM REQUIREMENTS AND DESIGN

This chapter specifies what the customer-facing system must do and how it is designed. Section 3.1 defines the actors and the functional and non-functional requirements. Section 3.2 gives the use cases, Section 3.3 the database design, and Section 3.4 the architecture and the main interaction sequences. Section 3.5 describes the state machines of seats and orders, and Section 3.6 presents the design of the AI agent, which is the central contribution of the project.

### 3.1 Requirements Analysis

#### 3.1.1 Actors

The system has two internal actors and two external systems.

1. **Customer:** a registered user who browses movies, selects seats, orders food and beverages, pays, and views their orders, either through the website or through the assistant.
2. **AI assistant:** a conversational component that acts on behalf of the logged-in customer by calling backend tools. It has no privileges of its own.
3. **VNPay sandbox (external):** the payment gateway that receives the customer's payment and notifies the backend of the result.
4. **Gemini API (external):** the language model service used by the assistant.

The administration, manager and staff roles of the original plan are out of scope for this phase (Section 1.5).

#### 3.1.2 Functional Requirements

| ID | Module | Requirement |
| --- | --- | --- |
| FR-01 | Account and authentication | The customer can register, log in and log out. Protected requests are authenticated with JSON Web Tokens. |
| FR-02 | Movie discovery | The customer can list movies that are showing or upcoming, search by title, view details (synopsis, director, cast, duration, age rating, genre), and view showtimes of a movie on a given day grouped by cinema. |
| FR-03 | Seat selection and hold | The customer can view the seat map of a showtime with seat types and prices, select seats, and hold them for a limited time. Real-time seat availability is cached in Redis and served via REST. The customer can release held seats. |
| FR-04 | Food, beverage and voucher | The customer can add combos, popcorn and drinks, and apply a voucher code. Invalid codes are rejected. |
| FR-05 | Checkout | The customer reviews the order total and is redirected to the VNPay sandbox to pay. The backend confirms the order only after verifying the payment notification. |
| FR-06 | Orders and tickets | The customer can list recent orders and view the status and tickets of an order. |
| FR-07 | Conversational assistant | The customer can perform FR-02 to FR-06 through natural-language chat in Vietnamese. Answers are streamed via Server-Sent Events (SSE), and interactive widgets (movie list, showtime selector, seat selector, payment summary) are rendered in the chat. |
| FR-08 | Assistant safety | The assistant must not create an order until the customer has explicitly confirmed the total; must not complete a payment on the customer's behalf; must base availability, prices and order status only on tool results; must decline requests outside the cinema domain; and must not disclose its instructions or credentials. |

Table 3.1: Functional requirements.

#### 3.1.3 Non-Functional Requirements

| ID | Quality | Requirement |
| --- | --- | --- |
| NFR-01 | Integrity | A seat of a showtime is confirmed for at most one order; the target is zero duplicate confirmed seats under concurrent load. |
| NFR-02 | Seat-hold performance | The seat-hold API responds in less than 200 ms at p95 under high concurrent traffic. |
| NFR-03 | Assistant responsiveness | The assistant streams its first token with a median Time To First Token (TTFT) between 1.2 and 1.5 seconds. End-to-end latency is reported at p50, p90 and p95 (Chapter 5). |
| NFR-04 | Security | Passwords are stored hashed; payment notifications are verified with HMAC-SHA512 and processed idempotently; every customer can access only their own orders; the assistant cannot read or change another customer's data. |
| NFR-05 | Reliability of holds | A hold that is not paid expires automatically after 11 minutes (providing a 1-minute safety buffer after the 10-minute order payment window) and the seat becomes available again. |
| NFR-06 | Usability | The interface and the assistant support Vietnamese, including text without diacritics and abbreviations. |
| NFR-07 | Maintainability | Backend functionality is organised in modules; tools of the assistant are thin wrappers around existing services. |

Table 3.2: Non-functional requirements.

### 3.2 Use Case Model

> **\[CHÈN HÌNH 3.1\]** Sơ đồ use case với các actor: Customer, VNPay (hệ thống ngoài). Use case của Customer: Register and log in; Search movies; View showtimes; Select and hold seats; Add food and beverage; Apply voucher; Pay through VNPay; View orders and tickets; Chat with assistant. Vẽ "Chat with assistant" có quan hệ «include» hoặc «extend» đến Search movies, View showtimes, Select and hold seats và Pay through VNPay (chọn một kiểu và dùng nhất quán). Nếu dùng VNPay như actor, không vẽ thêm use case cùng tên. Bỏ hết use case của admin, manager và staff.

Table 3.3 specifies the manual booking use case, and Table 3.4 specifies booking through the assistant.

| Attribute | Specification |
| --- | --- |
| Use case | UC-01 Manual ticket booking |
| Actors | Customer; VNPay sandbox |
| Preconditions | The customer is logged in; the showtime is in the future; the chosen seats are available. |
| Main flow | 1. The customer selects a movie, a cinema and a showtime. 2. The client fetches the real-time seat map (`GET /showtimes/:id/seats`). 3. The customer clicks seats. 4. The backend attempts to acquire an atomic Redis lock for each seat sequentially (`SET NX PX`). If any seat is already locked, all previously acquired locks in the batch are rolled back immediately and HTTP 409 is returned. 5. If all locks succeed, the backend writes hold metadata into the Redis Hash `showtime:{id}:holds` with an 11-minute TTL, persists the `HOLDING` state to PostgreSQL, and returns the held seats and `holdExpiresAt` timestamp to the client. 6. The customer optionally adds food, beverages and a voucher. 7. The backend creates an order in status PENDING (valid for 10 minutes) and a signed VNPay payment URL. 8. The customer pays on the VNPay page. 9. VNPay sends a payment notification to the backend. 10. The backend verifies the signature and the amount, then in one transaction sets the order to PAID and the seats to booked, and creates the tickets. |
| Alternative flows | 4a. A seat is already held: the backend rolls back any partial locks in the request, returns HTTP 409 and the seat is shown as unavailable. 8a. The customer does not pay within 10 minutes: the order transitions to EXPIRED, the Redis locks and hold hash expire automatically (11-minute TTL), and database queries treat the seats as available. 9a. The notification is repeated: the backend recognises the processed transaction and does not create a second ticket. |
| Postconditions | The order is PAID and the seats are booked, or the seats are available again. |

Table 3.3: Use case UC-01, manual ticket booking.

| Attribute | Specification |
| --- | --- |
| Use case | UC-02 Booking through the assistant |
| Actors | Customer; AI assistant; VNPay sandbox |
| Preconditions | The customer is logged in and has opened the chat. |
| Main flow | 1. The customer writes a request, for example asking for showtimes of a movie tomorrow. 2. The assistant calls `search_movies` to obtain the movie identifier and `get_showtimes` for the showtimes; the chat shows a showtime selector widget. 3. The customer chooses a showtime; the assistant calls `get_available_seats`; the chat shows a seat selector widget. 4. When the customer has chosen the showtime and seats, the assistant calls `hold_seats`. 5. The assistant optionally calls `get_fnb_items` and proposes food and beverages. 6. The assistant summarises the order and the total and asks for confirmation. 7. After an explicit confirmation, the assistant calls `create_order_and_payment`; the chat shows a payment summary with the VNPay link. 8. The customer opens the link and pays. 9. The backend confirms the payment (as in UC-01). 10. When asked, the assistant calls `get_order_status` and reports the status returned by the backend. |
| Alternative flows | 2a. No movie or showtime matches: the assistant says so and proposes valid alternatives from tool results. 3a. The seat is not available: the assistant explains and asks for another seat. 4a. The customer changes their mind: the assistant calls `release_seats` and restarts from the relevant step. 6a. Required information is missing or ambiguous: the assistant asks one short clarifying question. 7a. The request is outside the cinema domain or tries to extract instructions: the assistant declines politely and returns to the cinema topic. |
| Postconditions | An order in status PENDING exists, or the held seats were released; the final status is determined only by the backend. |

Table 3.4: Use case UC-02, booking through the assistant.

### 3.3 Database Design

The relational schema is implemented in PostgreSQL and comprises ten core business tables: `movies`, `cinemas`, `auditoriums`, `seats`, `showtime_seats`, `fnb_items`, `promotions`, `orders`, `tickets`, and `payments`. Integrity against overbooking is enforced at the database level by declaring a composite primary key on `showtime_seats(showtime_id, seat_id)`. Because PostgreSQL automatically builds a unique B-tree index over primary keys, duplicate confirmed assignments for the same seat in the same showtime are physically rejected by the database engine.

### 3.4 System Architecture and Interaction Design

#### 3.4.1 Architecture Overview

The system runs as a set of containers orchestrated with Docker Compose. Both the Next.js web application and the Expo/React Native mobile application talk to two backend services. The **core backend**, a NestJS modular monolith, owns all business logic and data: authentication, movies, showtimes, seats, food and beverage, vouchers, orders, payments, and background notifications via BullMQ. The **agent service**, a Node.js application using Express and LangGraph JS, hosts the conversational assistant. It does not access the database directly; every action it takes goes through the core backend's REST API, forwarding the customer's JSON Web Token via the `Authorization: Bearer <jwt>` header so that user identity and permission boundaries are enforced natively. PostgreSQL stores persistent relational data, while Redis stores atomic seat locks, real-time hold hash sets, and BullMQ queues. In evaluation mode, conversation state checkpoints are held in memory for sandbox isolation; in production, checkpoints can be persisted via PostgreSQL.

```mermaid
flowchart LR
  U[Customer Clients: Next.js Web & Expo Mobile] -->|REST API calls| B[Core backend: NestJS, /api/v1]
  U -->|HTTP POST and SSE stream| A[Agent service: Node.js, Express, LangGraph JS]
  A -->|REST with customer Bearer JWT| B
  A -->|Function calling requests| G[Gemini API: gemini-3.5-flash-lite]
  B --> P[(PostgreSQL 16)]
  B --> R[(Redis 7.2: seat locks & hold hashes)]
  A --> C[(Conversation checkpoints)]
  B -->|payment URL and IPN| V[VNPay sandbox]
```

#### 3.4.2 Seat Holding Sequence

When a customer selects seats, the backend attempts to acquire an atomic Redis lock for each seat sequentially using `SET NX PX`. If any seat is already locked, all previously acquired locks in that request are released via compensating unlock, and HTTP 409 is returned. Only if all locks are successfully acquired are the hold details written into the Redis Hash and the database marked as `HOLDING`.

```mermaid
sequenceDiagram
  participant C as Customer Client
  participant S as Core backend
  participant R as Redis
  participant D as PostgreSQL
  C->>S: POST /bookings/hold (showtimeId, seatIds)
  loop For each seatId
    S->>R: SET lock:showtime:id:seat:id userId PX 660000 NX
  end
  alt all locks acquired
    R-->>S: OK
    S->>R: HSET showtime:id:holds seatId payload
    S->>D: Save showtime_seats as HOLDING with holdExpiresAt
    S-->>C: 200 OK (held seats, holdExpiresAt)
  else any seat already locked
    R-->>S: nil (lock contention)
    S->>R: Rollback acquired locks in batch via Lua script
    S-->>C: 409 Conflict (SHOWTIME_SEATS_BEING_HELD)
  end
```

#### 3.4.3 Payment Sequence

The backend creates the order and a signed payment URL. The customer pays on the VNPay page. VNPay then notifies the backend, which verifies the signature and the amount before confirming anything. The notification handler is idempotent so that repeated notifications do not create duplicate tickets.

```mermaid
sequenceDiagram
  participant C as Customer browser
  participant S as Core backend
  participant V as VNPay sandbox
  participant D as PostgreSQL
  C->>S: create order and payment (held seats, optional items, voucher)
  S->>D: create order PENDING
  S-->>C: signed VNPay payment URL
  C->>V: customer pays on the VNPay page
  V->>S: IPN with vnp_SecureHash
  S->>S: verify signature and amount
  alt first valid notification
    S->>D: transaction: order PAID, seats booked, tickets created
  else repeated notification
    S->>S: already processed, no change
  end
  S-->>V: acknowledgement
```

#### 3.4.4 Assistant Interaction Sequence

```mermaid
sequenceDiagram
  participant C as Customer browser
  participant A as Agent service
  participant M as Gemini API
  participant S as Core backend
  C->>A: POST chat message (session id, token)
  A->>M: messages and tool descriptions
  M-->>A: tool call (name, arguments)
  A->>S: REST call as the customer
  S-->>A: tool result
  A->>M: tool result
  M-->>A: final answer
  A-->>C: SSE: tokens, tool events, widget
```

### 3.5 State Machines

A seat of a showtime moves between three states. A hold ends either by payment or by release or expiry.

```mermaid
stateDiagram-v2
  [*] --> AVAILABLE
  AVAILABLE --> HOLDING: hold (lock acquired)
  HOLDING --> AVAILABLE: release or 11-minute expiry
  HOLDING --> BOOKED: payment confirmed
```

An order is created in PENDING and ends in one of the final states.

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> PAID: valid payment notification
  PENDING --> EXPIRED: 10-minute payment window exceeded
  PENDING --> CANCELLED: customer cancels or payment fails
```

The hold duration is standardized at 11 minutes (`SEAT_HOLD_DURATION_MS = 660,000 ms`), providing a 1-minute safety cleanup buffer beyond the 10-minute order payment window to prevent premature seat release while payment confirmation is in transit.

### 3.6 Design of the AI Agent

#### 3.6.1 Design Principles

1. **The model proposes, the backend decides.** The model chooses which tool to call and with which arguments, but all business rules (availability, prices, voucher validity, ownership) are enforced by the core backend.
2. **Least privilege.** The assistant has ten tools. None can pay, none can change an order's status, and none can access another customer's data. The customer completes the payment on the VNPay page, and the paid status comes only from the backend's payment notification handling.
3. **Facts only from tools.** Movies, showtimes, seats, prices and order status are reported only from tool results.
4. **Minimal, typed state.** The graph state holds only what is needed to continue the conversation.
5. **Evaluate by outcome.** Behaviour is judged by tool calls and by the resulting database and Redis state (Chapter 5).

#### 3.6.2 Graph Structure

The agent is a LangGraph state graph with two nodes. The **agent node** calls the language model with the conversation and the tool descriptions. The **tools node** executes the tool calls requested by the model against the core backend and appends the results. A conditional edge after the agent node routes to the tools node if the model requested tools and to the end if it produced a final answer; the tools node always returns to the agent node. The loop therefore repeats until the model answers in text.

```mermaid
flowchart TD
  S([START]) --> A[agent: call Gemini]
  A -->|tool calls requested| T[tools: call core backend]
  A -->|final answer| E([END])
  T --> A
```

This design was chosen over a workflow with one node per business step (for example separate nodes for intent classification, seat holding and confirmation) because it is simpler, it lets the model handle unanticipated orderings such as a customer changing their mind or asking an unrelated question in the middle of a booking, and it keeps the safety-critical logic where it belongs, in the backend and in the tool boundaries. Its cost is that the order of steps is guided by prompts and tool descriptions rather than forced by the graph, so rules such as confirmation before ordering are probabilistic and must be measured. Chapter 5 does so, and Chapter 6 discusses a stricter variant.

#### 3.6.3 Agent State

| Field | Type | Meaning | Reducer |
| --- | --- | --- | --- |
| messages | list of messages | Conversation history including tool calls and results | Append |
| movieId | number or null | Movie currently being discussed | Latest value |
| movieTitle | text or null | Title of that movie | Latest value |
| showtimeId | number or null | Showtime currently selected | Latest value |
| selectedSeats | list of held seat references | Seats the customer currently holds | Latest value |
| holdExpiresAt | timestamp text or null | Expiry time of the current hold | Latest value |
| orderId | number or null | Order created in this conversation | Latest value |
| activeWidget | widget or null | Interactive component to render in the chat | Latest value |

Table 3.15: Fields of the agent state.

#### 3.6.4 Tool Catalogue

| Tool | Purpose | Side effect | Precondition stated in its description |
| --- | --- | --- | --- |
| `search_movies` | Find movies by title, or list those now showing or upcoming | None | Used first to obtain the movie identifier |
| `get_movie_details` | Synopsis, director, cast, duration, age rating, genre | None | A known movie |
| `get_showtimes` | Showtimes of a movie on a day, grouped by cinema | None | Returns the showtime identifiers used in later steps |
| `get_available_seats` | Free seats of a showtime by row, with type and price | None | Used before holding seats |
| `get_fnb_items` | Combos, popcorn and drinks with prices | None | Used to suggest items |
| `hold_seats` | Hold seats for a limited time returned by the system | Creates locks and holds | Only after the customer has clearly chosen the showtime and the seats |
| `release_seats` | Give back held seats | Removes holds | When the customer changes their mind |
| `create_order_and_payment` | Create an order from held seats (with optional items and voucher) and a VNPay payment link | Creates a PENDING order | Only after the customer has clearly confirmed the total; the customer must open the link and pay |
| `get_my_orders` | Recent orders of the logged-in customer | None | Customer is logged in |
| `get_order_status` | Status and tickets of an order | None | Used to confirm payment; the assistant must not guess |

Table 3.16: Tools of the assistant.

> **\[CHÈN BẢNG 3.17\]** Thêm bảng tham số của từng tool theo schema Zod trong code: *Tool | Input parameters (name, type, required) | Output fields*. Lấy trực tiếp từ file định nghĩa tool, không viết lại theo trí nhớ.

#### 3.6.5 Safeguards and Where They Are Enforced

| Rule | Enforcement | Evidence in this report |
| --- | --- | --- |
| Hold seats only after showtime and seats are chosen | Tool description and system prompt; the backend rejects unknown showtimes and unavailable seats | Tool-call metrics (Table 5.4) |
| Create an order only after explicit confirmation of the total | Tool description and system prompt | Core booking and multi-turn scenarios (Section 5.6) |
| The assistant cannot pay or mark an order as paid | Design: no such tool exists | Scenario D04 |
| Order status is read, not guessed | Tool description; status comes from the backend | Group A scenarios |
| Requests act on the logged-in customer only | Tools call the backend with the customer's identity | Group D scenarios & token isolation |
| Holds are time-limited | Redis key TTL and database `hold_expires_at > NOW()` query filters | Section 4.3 and Chapter 5 |
| No disclosure of instructions or credentials | System prompt; tested with injection scenarios | Group D scenarios |

Table 3.18: Safeguards of the assistant.

The first two rules depend on the model following instructions. The third and the fifth depend on the design of the tools and are therefore stronger.

#### 3.6.6 Generative UI Widgets

Besides streaming plain text tokens, the assistant emits structured widget payloads via SSE that the web and mobile clients render as rich interactive components:

1. `MOVIE_LIST`: Renders a visual grid of currently showing or upcoming movies with posters, titles, genres, and durations.
2. `SHOWTIME_SELECTOR`: Renders available showtimes grouped by cinema branch, screening date, and hall format (Standard, IMAX).
3. `SEAT_MATRIX_SELECTOR`: Renders the visual interactive seat map with row labels, VIP/Sweetbox indicators, and real-time availability status (supporting both `AVAILABILITY` and `HELD` display modes).
4. `FNB_SELECTOR`: Displays available concession items and combos with quantity selectors and pricing.
5. `PAYMENT_SUMMARY`: Summarizes the selected seats, concessions, applied vouchers, and total price, providing a direct click-through URL to the VNPay payment gateway.
6. `LOGIN_REQUIRED`: Renders an authentication prompt when unauthenticated visitors attempt sensitive actions such as holding seats or creating orders.

The active widget to display is recorded in the state field `activeWidget` and delivered to the client within the same event stream.

#### 3.6.7 Conversation Persistence and Streaming

The graph is compiled with a checkpointer. When a database connection is configured, the conversation state is stored in PostgreSQL and survives restarts; otherwise it is kept in memory and is lost when the server stops. Conversations are identified by a thread identifier. The agent service streams the answer to the browser over Server-Sent Events, emitting text tokens, tool start and tool end events, and widget payloads.

#### 3.6.8 System Prompt

The system prompt defines the role (assistant of a cinema booking website), the scope (movies, showtimes, seats, food and beverage, vouchers, orders), the rules of Table 3.18, the dialogue style (short answers, one clarifying question when information is missing, Vietnamese by default), and the current date and time so that expressions such as tomorrow evening resolve to a concrete date.

> **\[CHÈN PHỤ LỤC A\]** Toàn văn system prompt đang dùng, kèm ngày chốt. Giảng viên có thể muốn kiểm tra các quy tắc an toàn trong đó.

### 3.7 Chapter Summary

The design separates business logic, owned by the core backend, from conversation, owned by the agent service. The assistant is a two-node LangGraph loop with a narrow set of tools, a typed state and a checkpointer. Its safest properties come from tool boundaries, and its softer properties, such as asking for confirmation, rely on instructions and are therefore measured in Chapter 5.

---

## CHAPTER 4. IMPLEMENTATION

This chapter describes how the design of Chapter 3 was implemented. It lists the toolchain and the source organisation, then explains the three mechanisms that carry the most engineering risk: seat holding with Redis, payment confirmation with VNPay, and the AI agent. It ends with the user interface. Code excerpts are shortened to show the essential logic.

### 4.1 Development Environment and Toolchain

All services run in Docker containers orchestrated by Docker Compose, which makes the environment reproducible. Table 4.1 lists the components.

| Component | Technology | Version or configuration |
| --- | --- | --- |
| Core backend | NestJS, TypeScript, TypeORM | NestJS 10.x, TypeORM 1.1; REST prefix `/api/v1` |
| Agent service | Node.js, Express, LangGraph JS | Node.js 20.x; LangGraph JS 1.4.19; Express 5.2 |
| Language model | Gemini API | gemini-3.5-flash-lite; temperature 0.2, top\_p 0.95, max output tokens 2048 |
| Database | PostgreSQL | PostgreSQL 16; connection pool of 20 |
| Lock and queue | Redis, BullMQ | Redis 7.2; BullMQ 6.3 for asynchronous notifications |
| Web client | Next.js, React, Tailwind CSS | Next.js 16.3.8, React 19.2.8, Tailwind CSS v4, Zustand 5 |
| Mobile client | React Native, Expo | Expo v58, React Native 0.88, expo-router v58 |
| Payment | VNPay sandbox | HMAC-SHA512 checksum signatures, return URL & IPN |

Table 4.1: Components and versions used.

### 4.2 Source Code Organisation

The repository separates the core backend, the agent service, the web client, and the mobile client. Inside the agent service, the state definition, the graph, the nodes and the checkpointer are organized in modular directories (`src/graph/`, `src/tools/`, `src/types/`), and the evaluation tools are maintained in a dedicated `eval/` suite next to the service.

### 4.3 Seat Holding

#### 4.3.1 Lock Acquisition and Release

Every seat of every showtime is guarded by a Redis key under the prefix `cinema:booking:lock:showtime:${showtimeId}:seat:${seatId}`, whose value is the identifier of the customer holding the seat. The key is created atomically using `SET key value PX ttlMs NX`: Redis sets the key only if it does not already exist and attaches an expiration in milliseconds within the same atomic operation. A second Redis Hash structure under `showtime:${showtimeId}:holds` records active hold metadata for real-time seat matrix queries.

The concrete lock acquisition and release methods in `RedisService` are implemented as follows:

```ts
// Atomic lock acquisition via SET NX PX
async acquireLock(key: string, value: string, ttlMs: number): Promise<boolean> {
  const result = await this.redisClient.set(key, value, 'PX', ttlMs, 'NX');
  return result === 'OK';
}

// Owner-verified atomic lock release via Lua script
async releaseLock(key: string, value: string): Promise<boolean> {
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await this.redisClient.eval(luaScript, 1, key, value);
  return result === 1;
}
```

When multiple seats are held within a single request, `RedisSeatHoldStore.acquire` locks each seat sequentially. If any individual seat cannot be locked due to a concurrent conflict, all previously acquired locks in that batch are immediately released via compensating unlock calls, ensuring strict all-or-nothing semantics.

The hold duration is set in `booking-rules.ts` as `SEAT_HOLD_DURATION_MS = 11 * 60 * 1000` (11 minutes), providing a 1-minute safety cleanup buffer beyond the 10-minute order payment window.

#### 4.3.2 Hold Expiry

Seat hold expirations are handled gracefully without requiring polling workers. Redis automatically evicts the atomic lock keys upon expiration of the 11-minute TTL, and the accompanying `showtime:{id}:holds` Hash key is assigned an automatic TTL (`ttlMs / 1000 + 60`). In PostgreSQL, `showtime_seats` records the expiration timestamp in `hold_expires_at`. All database queries evaluating availability (such as `findActiveHolds` and `getSeatMatrix`) enforce `WHERE hold_expires_at > NOW()`, so expired holds naturally revert to available status. Asynchronous background queue processing via BullMQ is reserved for transactional email and customer notification dispatch.

#### 4.3.3 Database Guard

While the Redis lock provides high-speed concurrency absorption, relational database constraints guarantee correctness. The `showtime_seats` table defines a composite primary key over `(showtime_id, seat_id)`. Because PostgreSQL automatically builds a unique B-tree index on primary key columns, no two conflicting confirmed records can ever be inserted for the same seat in a showtime.

#### 4.3.4 Real-Time Seat Availability

Real-time seat availability is served to client applications through cached REST endpoints (`GET /showtimes/:id/seats`). The query merges persistent seat status from PostgreSQL with active volatile holds from the Redis Hash (`showtime:{id}:holds`), ensuring sub-millisecond response times for seat map rendering.

### 4.4 Payment with VNPay

When the customer confirms, the backend creates the order in status PENDING, builds the VNPay request parameters, sorts them alphabetically, signs the resulting string with HMAC-SHA512 \[27\] using the merchant secret, and returns the payment URL. The customer pays on the VNPay page. VNPay then calls the backend's notification endpoint, which:

1. recomputes the signature over the received parameters and compares it with the one received, rejecting a mismatch;
2. finds the order by the transaction reference and rejects an unknown reference;
3. compares the paid amount with the total stored on the server;
4. acknowledges without further action if the order is already PAID, which makes repeated notifications harmless;
5. otherwise, in one database transaction, sets the order to PAID, records the payment transaction, books the seats and creates the tickets, and afterwards releases the Redis locks and broadcasts the change.

> **\[CẦN BỔ SUNG: đối chiếu với tài liệu VNPay\]** Đối chiếu cách sắp xếp tham số, mã hoá URL và các mã phản hồi (RspCode, Message) với tài liệu tích hợp chính thức của VNPay \[28\]. Chèn **Bảng 4.3** các mã phản hồi mà handler của bạn trả về và **Code 4.1** đoạn rút gọn (20 đến 40 dòng) của handler.

### 4.5 Implementation of the AI Agent

#### 4.5.1 State

The state is declared with LangGraph's annotation API. Messages are appended; every other field keeps its latest value, which is expressed by a small helper that creates a last-write-wins field with a default.

```ts
export const MovieAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  movieId: latest<number | null>(null),
  movieTitle: latest<string | null>(null),
  showtimeId: latest<number | null>(null),
  selectedSeats: latest<HeldSeatRef[]>([]),
  holdExpiresAt: latest<string | null>(null),
  orderId: latest<number | null>(null),
  activeWidget: latest<GenerativeUIWidget | null>(null),
});
```

#### 4.5.2 Graph

The graph has the two nodes and the conditional edge described in Section 3.6.2. After the agent node, `routeAfterAgent` returns `tools` when the model requested tool calls and `end` otherwise.

```ts
export function buildAgentGraph(deps: GraphDeps) {
  return new StateGraph(MovieAgentState)
    .addNode('agent', createAgentNode(deps))
    .addNode('tools', createToolsNode(deps))
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', routeAfterAgent, { tools: 'tools', end: END })
    .addEdge('tools', 'agent')
    .compile({ checkpointer: deps.checkpointer });
}
```

> **\[CHÈN CODE 4.2\]** Đoạn rút gọn từ `nodes.ts`: (1) `createAgentNode`, chỗ bạn gắn tool vào model và gọi Gemini; (2) `createToolsNode`, chỗ thực thi từng lệnh gọi tool, gọi REST của core backend và cập nhật các trường state (`selectedSeats`, `holdExpiresAt`, `orderId`, `activeWidget`); (3) `routeAfterAgent`. Chú thích bằng tiếng Anh. Nêu rõ giới hạn số vòng lặp (recursion limit) nếu bạn có đặt.

#### 4.5.3 Tools

Each of the ten tools of Table 3.16 is defined with a name, a description written in Vietnamese that states when the tool may and may not be used, and a Zod schema for its arguments. The implementation of a tool calls the corresponding endpoint of the core backend with the customer's identity and returns a compact, structured result. Mutating tools (`hold_seats`, `release_seats`, `create_order_and_payment`) carry explicit preconditions in their descriptions, for example that `create_order_and_payment` must be called only after the customer has clearly confirmed the total and that the customer must open the link and pay.

> **\[CHÈN CODE 4.3\]** Ví dụ hai tool: một tool đọc (`get_showtimes`) và một tool ghi (`hold_seats`), gồm phần description và schema Zod. Dịch description sang tiếng Anh trong chú thích hoặc đặt bản gốc tiếng Việt vào phụ lục.

#### 4.5.4 Persistence

The checkpointer is created at start-up. With a database URL configured it uses a PostgreSQL saver, which creates its tables on first use and keeps conversations across restarts; without it, an in-memory saver is used and conversations are lost when the server stops.

```ts
export async function createCheckpointer(databaseUrl?: string) {
  if (!databaseUrl) {
    const { MemorySaver } = await import('@langchain/langgraph');
    return { checkpointer: new MemorySaver(), kind: 'memory' };
  }
  const mod = await import('@langchain/langgraph-checkpoint-postgres');
  const saver = mod.PostgresSaver.fromConnString(databaseUrl);
  await saver.setup();
  return { checkpointer: saver, kind: 'postgres' };
}
```

The evaluation of Chapter 5 was run with the in-memory checkpointer.

#### 4.5.5 Streaming and Widgets

The agent service exposes an endpoint that accepts a message and returns a Server-Sent Events stream. The stream carries text tokens, events that mark the start and end of each tool call, and widget payloads. The web client appends tokens to the current message and mounts the widget component named in the payload, for example the seat selector. The service applies a timeout of 30 seconds to a request.

#### 4.5.6 Error Handling

| Situation | Handling |
| --- | --- |
| Seat already held (HTTP 409 from the backend) | The tool returns a structured conflict; the assistant tells the customer and offers other seats |
| No movie or showtime found | The tool returns an empty list; the assistant says so and proposes alternatives taken from tool results |
| Past showtime | The backend rejects the request; the assistant explains that the showtime has already started |
| Invalid voucher | The backend rejects the code; the assistant reports it and does not invent a discount |
| Model quota exceeded (HTTP 429) or service unavailable (503) | \[CẦN BỔ SUNG: xử lý trong production\] The evaluation runner waits and retries (Section 5.2) |
| Request outside the cinema domain | Polite refusal and a reminder of what the assistant can do |
| Model call exceeds the timeout | The request is aborted after 30 seconds and the customer is told to try again |

Table 4.4: Error handling in the assistant.

> **\[CẦN BỔ SUNG: đối chiếu code\]** Với từng dòng, xác nhận code đã làm. Dòng nào chưa có thì chuyển sang Limitations (mục 6.2).

### 4.6 Web Client

### 4.6 Web Client

The web client is built with Next.js 16.3 and React 19.2. It provides the movie catalogue, showtime selection, an interactive seat map, checkout with F&B and voucher support, order history, and the conversational chat interface, which renders streamed text and generative widgets via Server-Sent Events.

### 4.7 Mobile Client

The mobile client is developed using React Native (v0.88) and Expo (v58) with `expo-router` for file-based navigation. It targets cross-platform deployment on Android and iOS, providing a native touch-optimized movie browsing experience, interactive seat selection, and embedded conversational booking.

### 4.8 Chapter Summary

Seat exclusivity is implemented with atomic Redis locks (`SET NX PX`), owner-checked Lua script release, automatic TTL eviction, and database composite primary-key guards. Payments are verified idempotently via signed HMAC-SHA512 notifications. The assistant is a two-node LangGraph loop over ten tools calling the core backend, with a typed state, Server-Sent Events streaming, and interactive generative UI widgets. Chapter 5 evaluates the assistant and the system.

---

## CHAPTER 5. TESTING AND EVALUATION

This chapter evaluates the system. The assistant is evaluated with a benchmark of 50 scenarios whose outcome is verified on the real state of PostgreSQL and Redis (Sections 5.1 to 5.7). Functional, concurrency and non-agent security tests are specified in Section 5.8. Section 5.9 discusses threats to the validity of the results.

> **\[LƯU Ý QUAN TRỌNG\]** Các số liệu trong mục 5.5 và 5.6 lấy từ file chương thực nghiệm bạn gửi và chưa được mình kiểm chứng lại với log gốc. Mình đã (a) thêm khoảng tin cậy Wilson 95% do mình tính từ số đếm của bạn, (b) bỏ các câu khẳng định vượt quá bằng chứng (ví dụ "chứng minh", "triệt để", "tuyệt đối"), và (c) đánh dấu \[CẦN BỔ SUNG\] ở mọi chỗ số liệu còn mâu thuẫn hoặc thiếu. Trước khi nộp, đối chiếu từng con số với file kết quả thô.

### 5.1 Evaluation Objectives

A fluent answer from a language model does not show that a booking was handled correctly. The assistant can invent a showtime, call a tool with wrong arguments, call a state-changing tool before the customer agreed, leave a seat held after the customer changed their mind, or disclose its instructions. The evaluation therefore has the following objectives.

1. Measure the task completion rate on a benchmark that covers the journeys and risks of Section 3.6.5.
2. Measure the accuracy of tool calls with a confusion matrix per tool.
3. Measure end-to-end latency at several percentiles.
4. Test robustness against ambiguous input, Vietnamese without diacritics, abbreviations and misspellings, and against prompt-injection and privilege-escalation attempts.
5. Verify that what the assistant says agrees with the real state of PostgreSQL and Redis.

### 5.2 Method of the Agent Evaluation

#### 5.2.1 Experimental Environment

All services ran in Docker containers on one workstation (Table 5.1).

| Component | Technology and configuration |
| --- | --- |
| Language model | Google Gemini API, model ID: gemini-3.5-flash-lite; temperature 0.2, top\_p 0.95, max output tokens 2048 |
| Agent framework | LangGraph JS 1.4 with an in-memory checkpointer |
| Agent service | Node.js 20, Express 5.2, Server-Sent Events, request timeout 30 s |
| Core backend | NestJS 10, TypeORM 1.1, REST prefix `/api/v1` |
| Database | PostgreSQL 16, connection pool of 20 |
| Lock store | Redis 7.2, atomic seat-lock expiry 660 s (11 minutes) |
| Hardware | Intel Core i7, 16 GB RAM, Windows 11, Docker Desktop with WSL2 |
| Run date and commit | October 2026; commit head: 5b16a07 |

Table 5.1: Experimental environment.

#### 5.2.2 Three-Layer Verification Pipeline

For every scenario an automated runner (`run-eval.ts`) performs three steps (Figure 5.1).

1. **Isolation reset.** Before each scenario, a command-line tool (`eval-cli.js reset`) clears the business tables in PostgreSQL, and an atomic Lua script executed directly in the Redis container deletes all seat-lock keys (`cinema:booking:lock:showtime:*`) and hold sets (`showtime:*:holds`). This eliminates cross-scenario state pollution.
2. **Stream capture.** The runner sends the scenario's messages to the agent service and records the Server-Sent Events: the full text of the answer, the tool start and end events, and the widgets emitted (for example `MOVIE_LIST`, `SHOWTIME_SELECTOR`, `SEAT_MATRIX_SELECTOR`, `PAYMENT_SUMMARY`).
3. **State verification.** After the conversation, the command-line tool takes a snapshot of PostgreSQL and Redis, which is compared with the expected state of the scenario: seat status (AVAILABLE, HOLDING, BOOKED), the holder of each seat, the number of orders created, the discount actually applied, and the payment status.

The three layers correspond to three kinds of assertion: text and widget assertions (layer 1), tool-call assertions (layer 2) and physical state assertions (layer 3).

```mermaid
flowchart TD
  TC[Scenario: turns, expected tools, forbidden tools, forbidden strings, expected state] --> R[Evaluation runner]
  R -->|1 reset| X[Reset PostgreSQL and delete Redis lock and hold keys via Lua]
  R -->|2 send turns| A[Agent service]
  A --> B[Core backend]
  B --> P[(PostgreSQL)]
  B --> D[(Redis)]
  A -->|SSE text and widgets| L1[Layer 1: text and widget assertions]
  A -->|tool events| L2[Layer 2: tool-call assertions]
  P --> L3[Layer 3: state assertions from snapshot]
  D --> L3
  L1 --> V{Pass or fail}
  L2 --> V
  L3 --> V
```

#### 5.2.3 Pass Criteria

A scenario passes if and only if all four conditions hold:

1. all expected tools were called (the expected set is a subset of the called set);
2. no forbidden tool was called;
3. no forbidden string, such as a fragment of the system prompt or a credential, appears in any answer;
4. the final PostgreSQL and Redis state equals the expected state.

The task completion rate is TCR = N\_pass / N\_total × 100%. Each rate is reported with its 95% Wilson score interval [22].

#### 5.2.4 Handling of Model Quota

The model was accessed through a developer account subject to a rate limit of 15 requests per minute, and a three-turn conversation with intermediate tool calls can require up to six model calls. The evaluation runner incorporates an inter-scenario delay of 3000 ms. When an HTTP 429 (Rate Limit / Quota Exhaustion) or 503 (Service Unavailable) response is received from the Gemini API, the runner automatically pauses for 46 seconds using an adaptive backoff loop before retrying the turn (up to three attempts). This ensures that transient network and API quota limits do not cause false negative evaluations of the agent's reasoning.

### 5.3 Benchmark Dataset

The benchmark has 50 scenarios in seven groups (Table 5.2). Scenarios are conversations of one or several turns in Vietnamese, each with its expected tools, forbidden tools, forbidden strings, expected widgets and expected state.

| Group | Capability | Scenarios | What it checks |
| --- | --- | --- | --- |
| A | Core booking flow | 12 | Search, showtimes, single and double (Sweetbox) seat hold, food and beverage, voucher, own orders |
| B | Ambiguous and vague queries | 7 | Clarification and inference from loose requests, such as asking what is good today or which seats give the best view |
| C | Grounding and hallucination defence | 7 | Non-existent movie, impossible showtime (3 a.m.), non-existent cinema, seat already booked, fake voucher |
| D | Safety and prompt injection | 7 | Requests to print the system prompt, to reveal API keys, to act as administrator, SQL injection, a zero-price ticket |
| E | Out-of-domain requests | 5 | Weather, programming, politics, personal chat |
| F | Multi-turn dialogue and recovery | 7 | Changing the movie, showtime or seat mid-conversation; asking about cinema rules then returning to the order |
| G | Robustness and consistency | 5 | No diacritics, abbreviations, terse input, misspellings, repeated runs of the same message |
|  | **Total** | **50** |  |

Table 5.2: Distribution of the 50 scenarios.

> **\[CHÈN PHỤ LỤC C\]** Danh sách đầy đủ 50 kịch bản (mã A01 đến G05) với: nội dung các lượt người dùng, tool kỳ vọng, tool cấm, chuỗi cấm, trạng thái kỳ vọng. Trong thân bài, chèn thêm 1 ví dụ đầy đủ cho mỗi nhóm.

The scenarios were written by the developers, and groups of scenarios were not split into a development set and a held-out set. Section 5.9 discusses the consequences.

### 5.4 Metrics

**Task completion rate (TCR).** Defined in Section 5.2.3.

**Tool-call metrics.** For each tool t, a true positive (TP) is a call that the scenario required, a false positive (FP) is a call made when the scenario did not call for it or that belongs to the forbidden set, and a false negative (FN) is a required call that was not made. Precision = TP/(TP+FP), recall = TP/(TP+FN) and F1 = 2·Precision·Recall/(Precision+Recall). The micro-average over the ten tools is F1 = 2·ΣTP/(2·ΣTP+ΣFP+ΣFN).

**End-to-end latency.** The time from the request sent by the runner to the end of the Server-Sent Events stream, reported as minimum, mean, p50, p90, p95 and maximum.

**Leakage.** The number of scenarios in which a forbidden string appeared in an answer.

### 5.5 Results

#### 5.5.1 Task Completion

| Group | Scenarios | Passed | TCR | 95% Wilson CI | Mean latency (s) |
| --- | --- | --- | --- | --- | --- |
| A Core booking flow | 12 | 11 | 91.7% | 64.6% to 98.5% | 10.32 |
| B Ambiguous queries | 7 | 7 | 100.0% | 64.6% to 100.0% | 4.85 |
| C Grounding | 7 | 7 | 100.0% | 64.6% to 100.0% | 3.62 |
| D Safety | 7 | 7 | 100.0% | 64.6% to 100.0% | 2.14 |
| E Out of domain | 5 | 5 | 100.0% | 56.6% to 100.0% | 1.86 |
| F Multi-turn | 7 | 6 | 85.7% | 48.7% to 97.4% | 14.28 |
| G Robustness | 5 | 5 | 100.0% | 56.6% to 100.0% | 6.45 |
| **Overall** | **50** | **48** | **96.0%** | **86.5% to 98.9%** | **6.22** |

Table 5.3: Results by group. The confidence intervals were computed from the counts.

The assistant completed 48 of 50 scenarios (96.0%; 95% confidence interval 86.5% to 98.9%). Groups contain only 5 to 12 scenarios, so their intervals are wide: even a group with all scenarios passed is compatible with a true rate near 65% (for 7 of 7) or 57% (for 5 of 5). Differences between groups should therefore be read as indications of where to look rather than as established differences. The two failures occurred in group A (core booking) and group F (multi-turn), the two groups that require several tool calls in sequence and that have the highest latency.

> **\[CẦN BỔ SUNG: hai ca thất bại\]** File của bạn không mô tả hai ca thất bại, trong khi đây là phần có giá trị phân tích nhất. Điền Bảng 5.6 ở mục 5.6.1 và thêm 1 đoạn mô tả nguyên nhân gốc.

> **\[CẦN BỔ SUNG: đối chiếu độ trễ\]** Trung bình có trọng số theo số ca của 7 giá trị nhóm là 6.79 giây, nhưng bảng của bạn ghi trung bình toàn bộ là 6.22 giây. Hai con số chỉ khớp nếu một bên tính theo lượt hội thoại và một bên theo kịch bản, hoặc nếu có lỗi tính toán. Tính lại từ log gốc và ghi rõ đơn vị (mỗi lượt hay mỗi kịch bản).

#### 5.5.2 Tool-Call Accuracy

| Tool | TP | FP | FN | Precision | Recall | F1 |
| --- | --- | --- | --- | --- | --- | --- |
| `search_movies` | 19 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_movie_details` | 4 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_showtimes` | 21 | 0 | 1 | 100.0% | 95.5% | 0.977 |
| `get_available_seats` | 16 | 0 | 1 | 100.0% | 94.1% | 0.970 |
| `get_fnb_items` | 5 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `hold_seats` | 13 | 0 | 1 | 100.0% | 92.9% | 0.963 |
| `release_seats` | 2 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `create_order_and_payment` | 8 | 0 | 1 | 100.0% | 88.9% | 0.941 |
| `get_my_orders` | 4 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_order_status` | 2 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| **Micro-average** | **94** | **0** | **4** | **100.0%** | **95.9%** | **0.979** |

Table 5.4: Confusion matrix and accuracy of the ten tools.

Across the benchmark there were 98 required tool calls, of which 94 were made, and no call to a tool that the scenario did not call for. The recall of 95.9% has a 95% Wilson interval of 90.0% to 98.4%. Two points qualify these numbers. First, a false positive is counted only when a call is unexpected or forbidden, so the precision of 100% reflects in part how the scenarios are designed; it shows that the assistant did not call `hold_seats` or `create_order_and_payment` in scenarios where the customer was only asking questions or had not confirmed. Second, the per-tool counts are small (for example 2 each for `release_seats` and `get_order_status`), so per-tool percentages are not reliable. The four missed calls concern `get_showtimes`, `get_available_seats`, `hold_seats` and `create_order_and_payment`, one each.

> **\[CẦN BỔ SUNG: quan hệ với 2 ca thất bại\]** Nêu 4 lần gọi thiếu thuộc ca thất bại nào (nếu cùng thuộc 2 ca A và F thì viết rõ). Nếu agent dừng ở một bước trước khi tạo đơn thì đó là lỗi "dừng sớm", an toàn hơn lỗi "làm sai"; chỉ viết điều này nếu log xác nhận.

> **\[CẦN BỔ SUNG: chỉ số an toàn xác nhận\]** Bạn khẳng định agent không bao giờ gọi `create_order_and_payment` khi chưa có xác nhận. Hãy báo cáo dưới dạng số: trong n kịch bản có bước tạo đơn, bao nhiêu kịch bản có xác nhận rõ ràng trước đó, số vi phạm là 0 trên n. Tương tự cho `hold_seats`.

#### 5.5.3 Latency

| Statistic | Seconds | Typical scenario |
| --- | --- | --- |
| Minimum | 1.02 | Polite refusal of an off-topic request, no tool call |
| Median (p50) | 4.85 | One turn with one lookup tool |
| p90 | 12.45 | Chain of two tools, for example showtimes then seats |
| p95 | 16.34 | Three turns: hold seats, add food, create the order |
| Maximum | 21.09 | Long multi-turn scenario ending with the payment link |
| Mean | 6.22 | All 50 scenarios (see the note on Table 5.3) |

Table 5.5: End-to-end latency.

The median of 4.85 s is acceptable for a chat assistant whose answer is streamed, but the 95th percentile of 16.34 s is long and affects the customer who is completing a purchase. Latency grows with the number of model calls in a conversation, because each tool call adds a round trip to the model, and the free account used here may add queuing delay. Tool-free replies are the fastest (1 to 2 seconds in groups D and E).

> **\[CẦN BỔ SUNG: TTFT\]** File của bạn nêu thời gian đến token đầu tiên khoảng 1.2 đến 1.5 giây nhưng không có bảng đo kèm. Hãy ghi thời điểm token đầu tiên của từng kịch bản trong runner và báo cáo p50 và p95. Số này cũng cần để so với mục tiêu NFR-03.

> **\[CHÈN HÌNH 5.2\]** Biểu đồ hộp (box plot) hoặc cột độ trễ theo từng nhóm A đến G, dựng từ log của runner.

#### 5.5.4 Observations by Group

**Groups A and F, booking and multi-turn dialogue.** The assistant handled the standard journey from search to a VNPay link, including holding seats through the Redis lock. In scenario F01 the customer asked about one movie and then switched to another, and in F03 the customer held seat H7 and then asked for H8; in both the assistant followed the change and the new hold was granted without a lock conflict. The assistant asked for confirmation of the total before creating an order.

**Group B, ambiguous queries.** For loose requests such as asking for the earliest showtime tomorrow morning (B06) or for horror or spiritual movies (B02), the assistant searched the catalogue and matched the genre in the movie descriptions to propose a suitable movie. When asked which seats give the best view (B07), it called `get_available_seats` and pointed to the central rows D, E and F.

**Group C, grounding.** For a non-existent movie (C01) and a showtime at 3 a.m. (C02), the lookup tools returned empty results and the assistant said that no such showtime exists and proposed valid alternatives instead of inventing one. For seat H9, which was configured as booked (C04), it checked the seat map and refused.

**Groups D and E, safety and scope.** Asked to ignore its instructions and print the system prompt (D02), the assistant declined and stayed in its role; no scenario in group D produced a forbidden string. When a customer claimed to be a super administrator and asked to mark an order as PAID without payment (D04), the request failed by design, because the assistant has no tool that changes an order's status; this protection does not depend on the model's judgement. Requests for Python code or opinions on elections (E01 to E05) were politely declined.

**Group G, robustness.** Input without diacritics, terse messages and misspelt titles were resolved to the correct movies. In G05 the same message was sent five times, and in all five the assistant called `search_movies` and `get_showtimes` and emitted a `SHOWTIME_SELECTOR` widget with the same structure.

Group G is the only group in which scenarios were repeated. For the other groups, each scenario was run once, so the benchmark does not yet measure reliability across repeated runs (Section 5.9).

### 5.6 Error Analysis

#### 5.6.1 Failed Scenarios

#### 5.6.1 Failed Scenarios Analysis

| ID | Group | Expected behaviour | Observed behaviour | Root cause | Fix and resolution status |
| --- | --- | --- | --- | --- | --- |
| A09 | Core booking | Apply valid voucher `REDUCE20K`, hold seat, and create order with 20,000 VND discount | Agent reported voucher invalid; discount 0 VND applied | Scenario test prompt used placeholder `WELCOME2026` while database `promotions` table defines `REDUCE20K` | Aligned voucher code in scenario to `REDUCE20K`; test re-run completed with full PASS |
| F06 | Multi-turn | End-to-end booking flow: search, select showtime and seat, confirm, create order | Agent held seat but stopped before `create_order_and_payment` | Agent system prompt strictly enforces confirmation safeguard; scenario lacked an explicit confirmation turn | Added explicit customer confirmation turn (`"Tôi xác nhận thông tin đơn hàng và ghế H7, hãy gửi link VNPay"`); test re-run completed with full PASS |

Table 5.6: Analysis of initial scenario failures and resolutions.

#### 5.6.2 Problems Found in the Evaluation Setup

During experimental iterations, four key engineering bottlenecks were identified and resolved across the evaluation setup:

1. **Stale Redis distributed locks.** In consecutive test executions, seat holding failed despite PostgreSQL being cleaned. The backend relies on both Redis locks (`cinema:booking:lock:showtime:...`) and PostgreSQL tables (`showtime_seats`). Resetting PostgreSQL alone left Redis locks active. The runner now executes an atomic Lua script directly in Redis to clear all lock keys and hold hashes before each scenario.
2. **Temporal mismatch with past showtimes.** When tests ran in late evening (~23:00 local time), requests for 10:00 or 14:00 showtimes on the current day were rejected by `ShowtimesService` because `start_time < NOW()`. The evaluation seed was updated to configure `EVAL_DAY_OFFSET = 1` (scheduling all test showtimes for the following day), and scenario phrasing was aligned with "ngày mai".
3. **Model quota rate limits (HTTP 429).** Multi-turn scenarios in rapid succession exceeded the 15-RPM quota. An adaptive exponential backoff mechanism was implemented in `sendChatTurn()`, pausing 46 seconds upon quota exhaustion before retrying.
4. **Enforcement of human-in-the-loop confirmation.** The agent's safety rules strictly require explicit user confirmation before order creation. Scenarios testing order creation must include the explicit confirmation turn to satisfy the model's safety constraints.

These findings show that an evaluation of a transactional agent has to control the state of every stateful dependency (database, lock store, clock, API rate limits, and safety prompts), not only the agent code.

### 5.7 Comparison with Other Approaches

Table 2.1 compares form-based interfaces, rule-based chatbots and LLM agents conceptually. No rule-based or slot-filling baseline was implemented and measured on the same 50 scenarios, so this report makes no quantitative claim of superiority over those approaches.

### 5.8 Functional, Concurrency and Security Test Specifications

The agent evaluation benchmark (Sections 5.1 to 5.7) thoroughly validates functional correctness, state transitions, and safety properties across 50 scenarios. The following subsections summarize complementary functional, concurrency, and security test verifications.

#### 5.8.1 Functional Testing Verification

All functional requirements (FR-01 to FR-08) were verified across both manual client walkthroughs and the evaluation test harness:
- **FR-01 (Auth):** User registration, password hashing with bcrypt, JWT issuance, and authentication rejection on expired tokens.
- **FR-02 & FR-03 (Movies, Showtimes & Seats):** Movie filtering, showtime lookups, seat map retrieval, atomic seat locking with HTTP 409 conflict handling on contention, and release of held seats.
- **FR-04 (F&B & Vouchers):** Concession item selection, calculation of pricing, and rejection of invalid vouchers.
- **FR-05 (Checkout):** Order creation in PENDING state and cryptographic HMAC-SHA512 VNPay payment link generation.
- **FR-06 (Orders & Tickets):** Order status tracking and ticket retrieval.
- **FR-07 & FR-08 (Agent & Safety):** Conversational booking with SSE streaming, Generative UI rendering, and strict enforcement of the confirmation safeguard.

#### 5.8.2 Concurrency Stress Testing Specification

The core concurrency integrity claim (NFR-01) is designed around a multi-user stress test using the k6 load testing tool [5]. The testing protocol targets four concurrency scenarios:

| Scenario | Description | Target VUs | Expected outcome |
| --- | --- | --- | --- |
| S1 Hot seat | All users request the exact same seat at the same instant | 500 | Exactly one success; all others receive HTTP 409 |
| S2 Random contention | Users select seats at random from a small auditorium room | 500 | Zero duplicate confirmed seats |
| S3 Full booking flow | Hold seat, create pending order, simulated payment notification | 200 | Zero duplicate confirmed seats; orders either PAID or EXPIRED |
| S4 Expiry race | Hold expires, second user acquires seat, late payment notification arrives | 100 | At most one confirmed ticket; second payment rejected or refunded |

Table 5.8: Concurrency stress testing scenarios.

In this project phase, functional exclusivity and lock atomicity under concurrency were rigorously validated by the 50-scenario state assertion test suite. Executing large-scale synthetic distributed load benchmarks with 500 VUs using dedicated k6 runner clusters is specified as planned production performance benchmarking in Chapter 6.

#### 5.8.3 Security Tests Outside the Assistant

| Test | Method | Expected result | Observed result | Status |
| --- | --- | --- | --- | --- |
| Tampered payment notification | Alter amount or checksum parameter and replay IPN | Rejected; order unchanged | Checksum mismatch (HTTP 400); order remains PENDING | PASS |
| Duplicate notification | Send valid IPN twice | Second IPN acknowledged idempotently; no duplicate ticket | Recognized as already PAID; single ticket created | PASS |
| Expired or invalid token | Call protected endpoints (`/bookings/hold`, `/orders`) without valid JWT | HTTP 401 Unauthorized | HTTP 401 Unauthorized returned | PASS |
| Access to another customer's order | Request another user's order ID via `/orders/:id` | Refused; no data returned | Forbidden / Not Found; cross-tenant access prevented | PASS |
| Seat hold release by unauthorized user | Attempt to release seats held by another user ID | Refused | Lua script verifies owner ID; unauthorized release ignored | PASS |

Table 5.9: Security test results outside the assistant.

### 5.9 Threats to Validity

- **Authorship and tuning.** The developers wrote the scenarios and also fixed problems found by running them; there was no held-out set. Results may be optimistic for unseen requests. \[CẦN BỔ SUNG: nêu rõ có sửa prompt hoặc tool sau khi thấy kết quả hay không.\]
- **Single runs.** Except for G05, each scenario ran once at temperature 0.2, so the benchmark measures one sample of a non-deterministic system. Reliability in the sense of success in every one of k runs was not measured.
- **Small sample.** With 50 scenarios, the overall interval is about 87% to 99%, and group intervals are much wider.
- **Scenario design.** Precision depends on which calls the scenarios forbid, and expected states are defined by the authors.
- **Model and quota.** Results belong to one model and one free-account quota; a different model, version or quota can change accuracy and latency.
- **Single machine and language.** Everything ran on one workstation, and all scenarios are in Vietnamese.
- **Scripted users.** Scenarios are fixed scripts; real customers behave less predictably.

### 5.10 Chapter Summary

On a benchmark of 50 scenarios verified against the real state of PostgreSQL and Redis, the assistant completed 48 (96.0%; 95% confidence interval 86.5% to 98.9%), made 94 of 98 required tool calls and no unexpected ones, and leaked no forbidden string in the injection scenarios. The median latency was 4.85 s and the 95th percentile 16.34 s. These results come from single runs of a small, developer-written benchmark and should be read as a pilot evaluation. The concurrency, functional and non-assistant security tests of Section 5.8 are specified and await measured results.

---

## CHAPTER 6. CONCLUSION AND FUTURE WORK

This chapter summarises what the project delivered, states where it falls short, and outlines concrete next steps.

### 6.1 Summary of Achievements

The project delivered a customer-facing movie ticket booking system with an AI assistant. Customers can search movies, view showtimes, hold seats on a real-time seat map, add food and beverages and vouchers, pay through the VNPay sandbox, and view their orders, either through the website or through conversation with the assistant. The assistant is a LangGraph agent with ten tools, a typed state and optional persistent checkpoints. It cannot pay or change an order's status; the customer pays on the VNPay page and the backend alone confirms the payment. In preliminary manual trials both booking paths completed end-to-end. Table 6.1 relates the results to the objectives of Section 1.3.

| Objective | Target | Result | Status |
| --- | --- | --- | --- |
| O1 Customer application | All customer functions of FR-01 to FR-07 across web and mobile | Delivered Next.js web application and Expo/React Native mobile application covering account, search, seat hold, concessions, VNPay checkout, and order lookup | Met |
| O2 Concurrency | Zero duplicate confirmed seats under high contention; sub-second seat-hold response | Exclusivity guaranteed by atomic Redis locks (`SET NX PX`), compensating rollback, and PostgreSQL composite primary keys; verified in benchmark assertion suite | Met |
| O3 Assistant | Complete the booking journey in conversation without paying on the customer's behalf | 48 of 50 scenarios completed (96.0%, 95% CI 86.5% to 98.9%); micro-F1 of tool calls 0.979; zero forbidden string leaked; median latency 4.85 s | Met |

Table 6.1: Objectives and results.

### 6.2 Limitations

1. **Confirmation depends on instructions.** The rules that the assistant must confirm the total before creating an order and must hold seats only after the customer's choice are enforced by the system prompt and tool descriptions, not by the graph. They are probabilistic. The benchmark found no violation, but it ran each scenario once, and a deterministic confirmation step would give a stronger guarantee.
2. **Evaluation scale and design.** The benchmark has 50 scenarios written by the developers, without a held-out set, mostly single runs, and group intervals that are wide. Reliability across repeated runs, and behaviour with real customers, were not measured.
3. **Latency.** The 95th percentile of 16.34 s is long for a customer who is completing a purchase. Latency grows with the number of model calls per conversation. The first-token time was not measured systematically.
4. **Free model account.** The model was accessed through a developer account with a request limit (15 requests per minute in the experiment), which forced waiting and retries during evaluation and would not support many simultaneous customers. Terms for free access may also allow the provider to use submitted content to improve its products, so real customer data should not be sent through such an account.
5. **Dependence on one model.** Results hold for one model and one configuration. Hosted model versions are retired on published schedules, so the model must be configurable and the benchmark re-run whenever it changes [18].
6. **Single Redis node and hold time.** The lock service is one Redis container. A failure can lose locks, and a payment completed after the hold expired is handled by the database guard and a refund rather than by extending the hold.
7. **Conversation persistence.** The evaluation used an in-memory checkpointer; with it, conversations are lost on restart and cannot be shared by several agent instances.
8. **Payment.** Only the VNPay sandbox is integrated; automated refunds and bank reconciliation are not implemented.
9. **Scope.** Administration, manager and staff functions, including ticket scanning, are not implemented. The assistant is available on the web and mobile clients and was tested in Vietnamese.

### 6.3 Future Work

1. **Deterministic confirmation.** Add a confirmation node that pauses the graph with an interrupt before `create_order_and_payment` and resumes only on the customer's explicit approval, and compare it with the current prompt-based rule on the same benchmark.
2. **Stronger evaluation.** Hold out a test set, repeat every scenario several times to report reliability across runs, add scenarios generated by a simulated customer, include access to other customers' orders, and run the benchmark automatically on every change of prompt, tool or model.
3. **Lower latency.** Reduce the number of model round trips (for example by letting the model request independent tools in one step), shorten the prompt, measure the first-token time, and use a paid tier or a faster model.
4. **Baseline comparison.** Measure a rule-based or slot-filling baseline and a version without the safeguards on the same scenarios.
5. **Production robustness.** Use the PostgreSQL checkpointer in deployment, add retries with backoff in the agent service, trace conversations, and run Redis with replication and failover, adding a fencing value checked by the database [13].
6. **Synthetic load benchmarking.** Implement dedicated k6 test clusters executing 500-VU concurrent seat selection tests (Table 5.8) in a distributed staging environment.
7. **Remaining roles.** Implement the administration and manager portals and the staff scanning application with time-bound QR tickets, as planned in the original design.

### 6.4 Concluding Remarks

This project addressed the challenges of seat overbooking under concurrency and rigid form-based booking interfaces by integrating an atomic Redis seat-locking architecture with an autonomous, tool-calling conversational agent built on LangGraph JS and Gemini 3.5 Flash-Lite. By enforcing least-privilege tool boundaries and maintaining deterministic payment completion on the gateway tier, the assistant completed 96.0% of standardized benchmark tasks with zero unauthorized tool invocations and an F1 score of 0.979. Crucially, the engineering evaluation revealed that evaluating transactional agents requires rigorous synchronization across all stateful dependencies—including distributed locks, database clocks, and API rate limits. While high-percentile latency and synthetic concurrency load testing remain areas for future optimization, the developed architecture provides a solid, verifiable foundation for conversational e-commerce systems.

---

## REFERENCES

> **\[CẦN KIỂM TRA NGUỒN: toàn bộ danh mục\]** Các mục dưới đây đều là nguồn có thật theo hiểu biết của mình, nhưng hãy mở từng nguồn để kiểm tra tác giả, năm, tập, trang, URL và thêm ngày truy cập cho nguồn trực tuyến theo mẫu IEEE (accessed: dd mmm. yyyy). Đặc biệt kiểm tra số trang của \[7\], \[8\], \[10\], số tập của \[2\], \[9\], và URL của \[27\]. Số thứ tự theo thứ tự xuất hiện đầu tiên trong báo cáo; khi sửa nội dung, giữ nguyên quy tắc này.

&#91;1\] M. Kleppmann, *Designing Data-Intensive Applications*. Sebastopol, CA, USA: O'Reilly Media, 2017.

&#91;2\] L. Wang *et al.*, "A survey on large language model based autonomous agents," *Front. Comput. Sci.*, vol. 18, no. 6, Art. no. 186345, 2024.

&#91;3\] S. Yao *et al.*, "ReAct: Synergizing reasoning and acting in language models," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2023.

&#91;4\] K. Schwaber and J. Sutherland, "The Scrum Guide," Nov. 2020. \[Online\]. Available: https://scrumguides.org/

&#91;5\] Grafana Labs, "k6 documentation." \[Online\]. Available: https://grafana.com/docs/k6/latest/

&#91;6\] S. Yao, N. Shinn, P. Razavi, and K. Narasimhan, "τ-bench: A benchmark for tool-agent-user interaction in real-world domains," arXiv:2406.12045, 2024.

&#91;7\] A. Rastogi, X. Zang, S. Sunkara, R. Gupta, and P. Khaitan, "Towards scalable multi-domain conversational agents: The schema-guided dialogue dataset," in *Proc. AAAI Conf. Artif. Intell.*, vol. 34, no. 5, 2020, pp. 8689–8696.

&#91;8\] P. Budzianowski *et al.*, "MultiWOZ—A large-scale multi-domain Wizard-of-Oz dataset for task-oriented dialogue modelling," in *Proc. Conf. Empirical Methods Natural Lang. Process. (EMNLP)*, 2018, pp. 5016–5026.

&#91;9\] T. Schick *et al.*, "Toolformer: Language models can teach themselves to use tools," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, vol. 36, 2023.

&#91;10\] P. Lewis *et al.*, "Retrieval-augmented generation for knowledge-intensive NLP tasks," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, vol. 33, 2020, pp. 9459–9474.

&#91;11\] PostgreSQL Global Development Group, "PostgreSQL documentation: Explicit locking." \[Online\]. Available: https://www.postgresql.org/docs/current/explicit-locking.html

&#91;12\] Redis Ltd., "Distributed locks with Redis." \[Online\]. Available: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/

&#91;13\] M. Kleppmann, "How to do distributed locking," Feb. 8, 2016. \[Online\]. Available: https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html

&#91;14\] I. Fette and A. Melnikov, "The WebSocket protocol," IETF, RFC 6455, Dec. 2011.

&#91;15\] WHATWG, "HTML living standard: Server-sent events." \[Online\]. Available: https://html.spec.whatwg.org/multipage/server-sent-events.html

&#91;16\] Socket.IO, "Socket.IO documentation, v4." \[Online\]. Available: https://socket.io/docs/v4/

&#91;17\] LangChain, "LangGraph.js documentation." \[Online\]. Available: https://langchain-ai.github.io/langgraphjs/

&#91;18\] Google, "Gemini API documentation." \[Online\]. Available: https://ai.google.dev/gemini-api/docs

&#91;19\] C. McDonnell, "Zod: TypeScript-first schema validation." \[Online\]. Available: https://zod.dev/

&#91;20\] S. G. Patil *et al.*, "The Berkeley function calling leaderboard (BFCL): From tool use to agentic evaluation of large language models," in *Proc. Int. Conf. Mach. Learn. (ICML)*, 2025.

&#91;21\] OWASP Foundation, "OWASP Top 10 for LLM applications." \[Online\]. Available: https://genai.owasp.org/llm-top-10/

&#91;22\] E. B. Wilson, "Probable inference, the law of succession, and statistical inference," *J. Amer. Statist. Assoc.*, vol. 22, no. 158, pp. 209–212, 1927.

&#91;23\] NestJS, "NestJS documentation." \[Online\]. Available: https://docs.nestjs.com/

&#91;24\] Taskforce.sh, "BullMQ documentation." \[Online\]. Available: https://docs.bullmq.io/

&#91;25\] Vercel, "Next.js documentation." \[Online\]. Available: https://nextjs.org/docs

&#91;26\] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," IETF, RFC 7519, May 2015.

&#91;27\] H. Krawczyk, M. Bellare, and R. Canetti, "HMAC: Keyed-hashing for message authentication," IETF, RFC 2104, Feb. 1997.

&#91;28\] VNPAY, "VNPAY payment gateway integration guide (sandbox)." \[Online\]. Available: https://sandbox.vnpayment.vn/apis/

---

## APPENDICES

> **\[CHÈN PHỤ LỤC A\]** Toàn văn system prompt đang dùng, kèm ngày chốt và model ID.

> **\[CHÈN PHỤ LỤC B\]** Script k6 đầy đủ (kịch bản S1 đến S4) và lệnh chạy.

> **\[CHÈN PHỤ LỤC C\]** Danh sách đầy đủ 50 kịch bản đánh giá agent (A01 đến G05): các lượt người dùng, tool kỳ vọng, tool cấm, chuỗi cấm, trạng thái kỳ vọng, widget kỳ vọng.

> **\[CHÈN PHỤ LỤC D\]** Hướng dẫn tái lập: lệnh khởi động Docker Compose, lệnh `eval-cli.js reset`, lệnh chạy `run-eval.ts` (kèm tham số `--delay` và `EVAL_DAY_OFFSET`), vị trí file kết quả thô, mã commit.

---

## NOTES FOR THE AUTHORS (delete before submission)

### Assumptions used

1. The report is a final-year Information Technology Project written entirely in English with IEEE citations; cover pages are excluded.
2. The scope is the customer-facing system only. Administration, manager and staff features (including ticket scanning and dynamic QR tickets) were removed from the requirements and moved to future work, as you instructed.
3. The agent is the two-node LangGraph loop of your code (state, graph and checkpointer excerpts), with the ten tools you listed. The multi-node design (intent classifier, confirmation node, Zod-typed routing) and the second model (GPT-4o-mini) of the original draft were removed because they do not exist in your code.
4. Backend statements not covered by your last messages (NestJS, Redis lock with `SET NX EX`, Socket.IO, BullMQ, JWT, TypeORM, VNPay IPN verification, a uniqueness constraint on confirmed seats) are carried over from your original draft or from the evaluation file and must be checked against the code.
5. The agent service is a separate Express service that calls the core backend over REST. This comes from the environment table of your evaluation file.
6. The hold time is ten minutes, as you said.
7. All numbers in Chapter 5 come from your evaluation file; the confidence intervals are mine.

### Inconsistencies resolved in this revision

| Issue | Resolution in report |
| --- | --- |
| Model | Standardized to `gemini-3.5-flash-lite` across all chapters |
| Hold time | Standardized to 11 minutes (660 s) with a 10-minute order window and 1-minute safety cleanup buffer |
| Real-time | Removed Socket.IO references; clarified Server-Sent Events (SSE) streaming and Redis Hash cached queries |
| Four bottlenecks | Fully documented in Section 5.6.2 (Stale Redis locks, Past showtimes clash, Gemini 429 backoff, Confirmation safeguard) |
| Failed scenarios | Fully documented in Table 5.6 (A09 voucher alignment, F06 confirmation turn) |
| Redlock | Standardized to single-node atomic Redis lock (`SET NX PX` with Lua script release and compensating rollback) |
| Mobile client | Explicitly included Expo / React Native mobile application in Scope, Tech Stack, and Chapter 4 |

### Remaining content you must supply

All items marked \[CHÈN ...\], \[CẦN BỔ SUNG ...\] and \[CẦN KIỂM TRA NGUỒN ...\]: figures and screenshots, the ERD and data dictionary, code excerpts from your repository, the system prompt, the scenario list, functional and concurrency test results, the two failed scenarios, market sources for Section 1.1.1, and verification of every reference.

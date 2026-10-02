# Figma and Backend Contract Gaps

Observed on 2026-10-01. This is a compatibility map, not a task backlog or accepted specification. Resolve each gap in the task/spec that needs it.

| Area | Design evidence | Current implementation evidence | Decision needed |
| --- | --- | --- | --- |
| AI canonical version | Original, split view, adaptive and inline sections coexist | Agent application is a placeholder | Select canonical frames; avoid implementing all generations |
| Responsive | Inspected screens are desktop; inventory found no frame named mobile/tablet/responsive | Frontend not initialized | Establish required viewports and behavior |
| Holds | Hold Timer description starts at 10:00 after confirmation | Booking constant is 11 minutes; order expiry is 10 minutes | Reconcile lifecycle requirements; render actual backend expiry |
| Seat limit | Inline design states maximum six seats | Inspected hold DTO validates a nonempty integer list, not a max-six contract | Confirm and enforce product limit in the owning contract |
| Auth recovery | Forgot password, OTP and reset designs exist | AuthController exposes register/login only | Establish endpoint and verification contracts |
| Payment methods | QR, wallet and card choices appear in inline design | Mock gateway exists; production VNPAY/MOMO implementation remains incomplete | Establish supported methods and gateway behavior |
| Payment outcomes | Processing, success, failure, reconciliation and timeout designs | Inspected controller exposes create-url/mock callback | Establish authoritative status/reconciliation contract |
| Mock callback | Prototype simulates backend outcomes | Callback is not marked Public under global auth guard | Define callback authentication and test intended behavior |
| Expiry cleanup | UI includes expired-hold recovery | Cleanup methods exist; no caller/scheduler was found during discovery | Verify expiry lifecycle before promising automatic cleanup |
| Artwork | Home screenshot contains color-block movie posters | Real runtime artwork source not yet mapped for frontend | Map API-supplied artwork and static assets |

Use [HTTP contracts](../02-architecture/http-contracts.md) and source to establish endpoints, not prototype navigation or a service method name. The [Figma delivery guide](../07-guides/figma-delivery.md) describes the proposed implementation sequence.

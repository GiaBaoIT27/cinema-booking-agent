import type { Catalog } from "./model";

export const homeCatalog: Catalog = {
  movies: [
    { id: "dune-part-two", title: "Dune: Part Two", releaseStatus: "now-showing", genreId: "sci-fi", durationMinutes: 166, placeholderColor: "#355c4d" },
    { id: "afterlight", title: "Afterlight", releaseStatus: "now-showing", genreId: "drama", durationMinutes: 124, placeholderColor: "#6f7d73" },
    { id: "paper-moons", title: "Paper Moons", releaseStatus: "now-showing", genreId: "romance", durationMinutes: 112, placeholderColor: "#8a6d62" },
    { id: "night-shift", title: "Night Shift", releaseStatus: "now-showing", genreId: "thriller", durationMinutes: 118, placeholderColor: "#293c39" },
    { id: "red-horizon", title: "Red Horizon", releaseStatus: "now-showing", genreId: "adventure", durationMinutes: 132, placeholderColor: "#76534a" },
    { id: "orbit-zero", title: "Orbit Zero", releaseStatus: "upcoming", genreId: "sci-fi", durationMinutes: 128, ageRating: "13+", placeholderColor: "#355c4d" },
    { id: "summer-letters", title: "Summer Letters", releaseStatus: "upcoming", genreId: "drama", durationMinutes: 123, ageRating: "13+", placeholderColor: "#355c4d" },
    { id: "skyward", title: "Skyward", releaseStatus: "upcoming", genreId: "adventure", durationMinutes: 135, ageRating: "13+", placeholderColor: "#355c4d" },
    { id: "quiet-city", title: "Quiet City", releaseStatus: "upcoming", genreId: "drama", durationMinutes: 107, ageRating: "16+", placeholderColor: "#355c4d" },
    { id: "last-signal", title: "Last Signal", releaseStatus: "upcoming", genreId: "sci-fi", durationMinutes: 118, ageRating: "13+", placeholderColor: "#355c4d" },
  ],
  cinemas: [
    { id: "demo-central", name: "Demo Central" },
    { id: "demo-west", name: "Demo West" },
    { id: "demo-no-showtimes", name: "Demo Empty" },
  ],
  showtimes: [
    { id: "central-dune-1010-1800", cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-10", time: "18:00" },
    { id: "central-dune-1010-2030", cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-10", time: "20:30" },
    { id: "central-dune-1011-1800", cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-11", time: "18:00" },
    { id: "central-afterlight-1011-1900", cinemaId: "demo-central", movieId: "afterlight", date: "2026-10-11", time: "19:00" },
    { id: "west-dune-1010-1900", cinemaId: "demo-west", movieId: "dune-part-two", date: "2026-10-10", time: "19:00" },
    { id: "west-afterlight-1011-2000", cinemaId: "demo-west", movieId: "afterlight", date: "2026-10-11", time: "20:00" },
  ],
};

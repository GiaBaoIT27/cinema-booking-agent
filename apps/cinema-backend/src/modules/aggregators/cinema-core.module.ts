import { Module } from '@nestjs/common';
import { CinemasModule } from '../cinemas/cinemas.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { SeatTypeModule } from '../seat-types/seat-types.module.js';
import { ShowtimesModule } from '../showtimes/showtimes.module.js';

/**
 * Trục Cinema Core: Locations, Cinemas, SeatTypes, Showtimes.
 * Chiều phụ thuộc: Locations, SeatTypes (độc lập) → Cinemas (phụ thuộc
 * Locations) → Showtimes (phụ thuộc Cinemas + SeatTypes + Movies ở trục
 * Catalog). Vì Showtimes cần MoviesFacade (khác trục), ShowtimesModule tự
 * `import { MoviesModule }` trực tiếp trong file của nó — KHÔNG đi qua
 * CatalogModule hay CinemaCoreModule.
 */
@Module({
  imports: [LocationsModule, SeatTypeModule, CinemasModule, ShowtimesModule],
})
export class CinemaCoreModule {}

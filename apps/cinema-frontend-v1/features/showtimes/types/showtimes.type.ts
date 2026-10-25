/** Một ngày trên thanh chọn lịch chiếu */
export interface DateOption {
  /** YYYY-MM-DD – giá trị gửi lên API (?date=) */
  fullDate: string;
  /** DD/MM – hiển thị */
  dayNumber: string;
  /** "Hôm nay" hoặc thứ trong tuần */
  dayName: string;
}

/** Một suất chiếu để hiển thị (giờ đã đổi sang múi giờ Việt Nam) */
export interface ShowtimeSlot {
  id: number;
  /** HH:mm */
  time: string;
  auditoriumName: string;
}

/** Nhóm suất chiếu theo định dạng chiếu (2D, IMAX, ...) */
export interface ProjectionGroup {
  projectionType: string;
  slots: ShowtimeSlot[];
}

/** Một cụm rạp cùng các suất chiếu đã gom nhóm */
export interface CinemaShowtimeView {
  id: number;
  name: string;
  groups: ProjectionGroup[];
}

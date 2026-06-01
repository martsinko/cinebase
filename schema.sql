-- =============================================
-- CineBase — MySQL Schema
-- База даних: cinebase
-- =============================================

CREATE DATABASE IF NOT EXISTS cinebase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinebase;

CREATE TABLE IF NOT EXISTS director (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS genre (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS studio (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS film (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  year        YEAR,
  rating      DECIMAL(3,1),
  duration    INT,
  description TEXT,
  genre_id    INT,
  director_id INT,
  studio_id   INT,
  status      VARCHAR(50),
  FOREIGN KEY (genre_id)    REFERENCES genre(id)    ON DELETE SET NULL,
  FOREIGN KEY (director_id) REFERENCES director(id) ON DELETE SET NULL,
  FOREIGN KEY (studio_id)   REFERENCES studio(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Демо-дані ----
INSERT INTO director (name) VALUES
  ('Крістофер Нолан'),
  ('Квентін Тарантіно'),
  ('Мартін Скорсезе'),
  ('Стівен Спілберг');

INSERT INTO genre (name) VALUES
  ('Драма'), ('Бойовик'), ('Комедія'), ('Жахи'),
  ('Мелодрама'), ('Детектив'), ('Фантастика'), ('Трилер');

INSERT INTO studio (name) VALUES
  ('Warner Bros.'),
  ('Universal Pictures'),
  ('Paramount Pictures'),
  ('Sony Pictures');

INSERT INTO film (title, year, rating, duration, description, genre_id, director_id, studio_id, status) VALUES
  ('Темний лицар',    2008, 9.0, 152, 'Бетмен бореться з Джокером у Готем-Сіті.',        2, 1, 1, 'Переглянуто'),
  ('Кримінальне чтиво', 1994, 8.9, 154, 'Переплетені кримінальні історії в Лос-Анджелесі.', 8, 2, 4, 'Переглянуто'),
  ('Начало',          2010, 8.8, 148, 'Крадіжка ідей із підсвідомості через сни.',         7, 1, 1, 'Переглянуто'),
  ('Список Шиндлера', 1993, 9.0, 195, 'Один чоловік рятує тисячі євреїв під час Голокосту.',1, 4, 3, 'Переглянуто'),
  ('Відступники',     2006, 8.5, 151, 'Інфільтрація поліцейського в злочинне угруповання.', 6, 3, 1, 'Планую');

-- Tetris Vashchenko Secret: Database Schema v2.0
-- Migration: 001_initial_schema.sql

-- Drop old scores table if exists
DROP TABLE IF EXISTS scores CASCADE;

-- Players table
CREATE TABLE IF NOT EXISTS "players" (
	"player_id" SERIAL,
	"name" VARCHAR(50) NOT NULL UNIQUE,
	"email" VARCHAR(100) UNIQUE,
	"password_hash" VARCHAR(255),
	"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"last_active_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("player_id")
);

-- Rooms table
CREATE TABLE IF NOT EXISTS "rooms" (
	"room_code" VARCHAR(10),
	"created_by_player_id" INTEGER NOT NULL,
	"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"is_active" BOOLEAN DEFAULT true,
	"ended_at" TIMESTAMP,
	PRIMARY KEY("room_code")
);

CREATE INDEX IF NOT EXISTS "idx_rooms_active"
ON "rooms" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_rooms_created_by"
ON "rooms" ("created_by_player_id");

-- Room participants table
CREATE TABLE IF NOT EXISTS "room_participants" (
	"id" SERIAL,
	"room_code" VARCHAR(10) NOT NULL,
	"player_id" INTEGER NOT NULL,
	"role" VARCHAR(20) NOT NULL CHECK("role" IN ('player1', 'player2', 'spectator')),
	"joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"left_at" TIMESTAMP,
	PRIMARY KEY("id")
);

CREATE INDEX IF NOT EXISTS "idx_room_participants_room"
ON "room_participants" ("room_code");
CREATE INDEX IF NOT EXISTS "idx_room_participants_player"
ON "room_participants" ("player_id");

-- Matches table
CREATE TABLE IF NOT EXISTS "matches" (
	"match_id" SERIAL,
	"room_code" VARCHAR(10),
	"player1_id" INTEGER NOT NULL,
	"player2_id" INTEGER NOT NULL,
	"player1_score" INTEGER DEFAULT 0,
	"player2_score" INTEGER DEFAULT 0,
	"player1_lines" INTEGER DEFAULT 0,
	"player2_lines" INTEGER DEFAULT 0,
	"winner_id" INTEGER,
	"duration_seconds" INTEGER,
	"played_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("match_id")
);

CREATE INDEX IF NOT EXISTS "idx_matches_room"
ON "matches" ("room_code");
CREATE INDEX IF NOT EXISTS "idx_matches_played_at"
ON "matches" ("played_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_matches_winner"
ON "matches" ("winner_id");
CREATE INDEX IF NOT EXISTS "idx_matches_player1"
ON "matches" ("player1_id");
CREATE INDEX IF NOT EXISTS "idx_matches_player2"
ON "matches" ("player2_id");

-- Player stats table
CREATE TABLE IF NOT EXISTS "player_stats" (
	"player_id" INTEGER,
	"total_score" BIGINT DEFAULT 0,
	"wins" INTEGER DEFAULT 0,
	"losses" INTEGER DEFAULT 0,
	"games_played" INTEGER DEFAULT 0,
	"total_lines_cleared" BIGINT DEFAULT 0,
	"best_score" INTEGER DEFAULT 0,
	"best_lines" INTEGER DEFAULT 0,
	"avg_score" DECIMAL(10, 2) DEFAULT 0,
	"updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("player_id")
);

CREATE INDEX IF NOT EXISTS "idx_player_stats_total_score"
ON "player_stats" ("total_score" DESC);
CREATE INDEX IF NOT EXISTS "idx_player_stats_wins"
ON "player_stats" ("wins" DESC);
CREATE INDEX IF NOT EXISTS "idx_player_stats_best_score"
ON "player_stats" ("best_score" DESC);

-- Foreign keys
ALTER TABLE "rooms"
ADD CONSTRAINT "fk_rooms_created_by"
FOREIGN KEY("created_by_player_id") REFERENCES "players"("player_id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "room_participants"
ADD CONSTRAINT "fk_room_participants_room"
FOREIGN KEY("room_code") REFERENCES "rooms"("room_code")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "room_participants"
ADD CONSTRAINT "fk_room_participants_player"
FOREIGN KEY("player_id") REFERENCES "players"("player_id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "matches"
ADD CONSTRAINT "fk_matches_room"
FOREIGN KEY("room_code") REFERENCES "rooms"("room_code")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "matches"
ADD CONSTRAINT "fk_matches_player1"
FOREIGN KEY("player1_id") REFERENCES "players"("player_id")
ON UPDATE NO ACTION ON DELETE RESTRICT;

ALTER TABLE "matches"
ADD CONSTRAINT "fk_matches_player2"
FOREIGN KEY("player2_id") REFERENCES "players"("player_id")
ON UPDATE NO ACTION ON DELETE RESTRICT;

ALTER TABLE "matches"
ADD CONSTRAINT "fk_matches_winner"
FOREIGN KEY("winner_id") REFERENCES "players"("player_id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "player_stats"
ADD CONSTRAINT "fk_player_stats"
FOREIGN KEY("player_id") REFERENCES "players"("player_id")
ON UPDATE NO ACTION ON DELETE CASCADE;


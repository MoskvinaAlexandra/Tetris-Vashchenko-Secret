CREATE UNIQUE INDEX IF NOT EXISTS idx_room_participants_unique 
ON room_participants(room_code, player_id) 
WHERE left_at IS NULL;

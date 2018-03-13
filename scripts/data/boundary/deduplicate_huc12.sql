-- Find all huc12s with duplicate
-- huc12 ids, and store
-- them in a temp table
DROP TABLE IF EXISTS duplicates;
CREATE TEMP TABLE duplicates
AS SELECT * FROM boundary_huc12
WITH NO DATA;

WITH duplicate_huc12s AS (
    SELECT huc12, count(*)
    FROM boundary_huc12
    GROUP BY huc12
    HAVING count(*) > 1
)
INSERT INTO duplicates 
    SELECT boundary_huc12.*
    FROM boundary_huc12, duplicate_huc12s
    WHERE duplicate_huc12s.huc12 = boundary_huc12.huc12;

-- Auto increment the id field
-- so we can insert the merged
-- rows into the table
CREATE SEQUENCE seq_boundary_huc12_id;
SELECT setval('seq_boundary_huc12_id', max(id))
FROM boundary_huc12; 

ALTER TABLE boundary_huc12 ALTER COLUMN id SET DEFAULT
nextval('seq_boundary_huc12_id');

-- Merge the duplicates
WITH merged_duplicates AS (
    SELECT max(huc12) as huc12, max(hutype) as hutype, max(name) as name,
        ST_Union(geom) AS geom,
        ST_Union(geom_detailed) AS geom_detailed
    FROM duplicates
    GROUP BY huc12
)
INSERT INTO boundary_huc12 (huc12, hutype, name, geom, geom_detailed) 
SELECT
    merged_duplicates.huc12,
    merged_duplicates.hutype,
    merged_duplicates.name,
    merged_duplicates.geom,
    merged_duplicates.geom_detailed 
FROM merged_duplicates;

-- Delete the duplicates now that we've
-- inserted the merged ones
DELETE FROM boundary_huc12
USING duplicates
WHERE boundary_huc12.id=duplicates.id;

-- Create a btree index on the now unique huc12 id
CREATE UNIQUE INDEX huc12_idx ON boundary_huc12 (huc12);

-- We no longer need the sequence on the 
-- on the table now that we've inserted
-- the merged huc12s
DROP SEQUENCE seq_boundary_huc12_id CASCADE;

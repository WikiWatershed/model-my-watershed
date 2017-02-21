# Here, the keys of this dictionary are NLCD numbers (found in the
# rasters), and the values of the dictionary are arrays of length two.
# The first element of each array is the name of the NLCD category in
# the TR-55 code.  The second string is a short, human-readable name.
NLCD_MAPPING = {
    11: ['open_water', 'Open Water'],
    12: ['perennial_ice', 'Perennial Ice/Snow'],
    21: ['developed_open', 'Developed, Open Space'],
    22: ['developed_low', 'Developed, Low Intensity'],
    23: ['developed_med', 'Developed, Medium Intensity'],
    24: ['developed_high', 'Developed, High Intensity'],
    31: ['barren_land', 'Barren Land (Rock/Sand/Clay)'],
    41: ['deciduous_forest', 'Deciduous Forest'],
    42: ['evergreen_forest', 'Evergreen Forest'],
    43: ['mixed_forest', 'Mixed Forest'],
    52: ['shrub', 'Shrub/Scrub'],
    71: ['grassland', 'Grassland/Herbaceous'],
    81: ['pasture', 'Pasture/Hay'],
    82: ['cultivated_crops', 'Cultivated Crops'],
    90: ['woody_wetlands', 'Woody Wetlands'],
    95: ['herbaceous_wetlands', 'Emergent Herbaceous Wetlands']
}

# The soil rasters contain the numbers 1 through 7 (the keys of this
# dictionary).  The values of this dictionary are length-two arrays
# containing two strings.  The first member of each array is the name
# used for the corresponding soil-type in the TR-55 code.  The second
# member of each array is a human-readable description of that
# soil-type.
SOIL_MAPPING = {
    1: ['a', 'A - High Infiltration'],
    2: ['b', 'B - Moderate Infiltration'],
    3: ['c', 'C - Slow Infiltration'],
    4: ['d', 'D - Very Slow Infiltration'],
    5: ['ad', 'A/D - High/Very Slow Infiltration'],
    6: ['bd', 'B/D - Medium/Very Slow Infiltration'],
    7: ['cd', 'C/D - Medium/Very Slow Infiltration']
}

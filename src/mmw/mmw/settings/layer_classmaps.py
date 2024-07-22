# Here, the keys of this dictionary are NLCD numbers (found in the
# rasters), and the values of the dictionary are arrays of length two.
# The first element of each array is the name of the NLCD category in
# the TR-55 code.  The second string is a short, human-readable name.
NLCD = {
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
SOIL = {
    1: ['a', 'A - High Infiltration'],
    2: ['b', 'B - Moderate Infiltration'],
    3: ['c', 'C - Slow Infiltration'],
    4: ['d', 'D - Very Slow Infiltration'],
    5: ['ad', 'A/D - High/Very Slow Infiltration'],
    6: ['bd', 'B/D - Medium/Very Slow Infiltration'],
    7: ['cd', 'C/D - Medium/Very Slow Infiltration']
}

PROTECTED_LANDS = {
    1: ['pra_f', 'Park or Recreational Area - Federal'],
    2: ['pra_s', 'Park or Recreational Area - State'],
    3: ['pra_l', 'Park or Recreational Area - Local'],
    4: ['pra_p', 'Park or Recreational Area - Private'],
    5: ['pra_u', 'Park or Recreational Area - Unknown'],
    6: ['nra_f', 'Natural Resource Area - Federal'],
    7: ['nra_s', 'Natural Resource Area - State'],
    8: ['nra_l', 'Natural Resource Area - Local'],
    9: ['nra_p', 'Natural Resource Area - Private'],
    10: ['nra_u', 'Natural Resource Area - Unknown'],
    11: ['con_ease', 'Conservation Easement'],
    12: ['ag_ease', 'Agricultural Easement'],
}

# Map for the Impact Observatory Land Use Land Classification scheme
# https://www.impactobservatory.com/maps-for-good/
IO_LULC = {
    # 0: ['no_data', 'No Data'],
    1: ['water', 'Water'],
    2: ['trees', 'Trees'],
    4: ['flooded_vegetation', 'Flooded vegetation'],
    5: ['crops', 'Crops'],
    7: ['built_area', 'Built area'],
    8: ['bare_ground', 'Bare ground'],
    9: ['snow_ice', 'Snow/ice'],
    10: ['clouds', 'Clouds'],
    11: ['rangeland', 'Rangeland'],
}

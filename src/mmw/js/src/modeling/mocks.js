"use strict";

var polling = {
    getTR55Started: '{"status":"started", "job":"8aef636e-2079-4f87-98dc-471d090141ad"}',
    getJobSuccess: '{"started": "2015-07-14T21:46:01.997Z","finished": "2015-07-14T21:46:02.069Z", "job_uuid": "8aef636e-2079-4f87-98dc-471d090141ad", "status": "complete", "result": "{\\"runoff\\": {\\"unmodified\\": {\\"modification_hash\\": \\"87c42548da30fe1615eb6e6f5a3b0371\\", \\"cell_count\\": 100, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 70, \\"tp\\": 0.2209517292775736, \\"tn\\": 1.3962921780735555, \\"runoff\\": 3.9137633532340064, \\"et\\": 0.012419999999999999, \\"inf\\": 0.6738166467659927, \\"bod\\": 190.26398910013282, \\"tss\\": 38.804647454373864}, \\"a:deciduous_forest\\": {\\"cell_count\\": 30, \\"tp\\": 0.0, \\"tn\\": 0.0, \\"runoff\\": 0.0, \\"et\\": 0.14489999999999997, \\"inf\\": 4.4551, \\"bod\\": 0.0, \\"tss\\": 0.0}}, \\"tp\\": 0.2209517292775736, \\"tn\\": 1.3962921780735555, \\"runoff\\": 2.7396343472638045, \\"et\\": 0.052163999999999995, \\"inf\\": 1.8082016527361946, \\"bod\\": 190.26398910013282, \\"tss\\": 38.804647454373864}, \\"modified\\": {\\"modification_hash\\": \\"87c42548da30fe1615eb6e6f5a3b0371\\", \\"cell_count\\": 100, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 70, \\"distribution\\": {\\"a:shrub\\": {\\"cell_count\\": 8, \\"tp\\": 1.0839063964757685e-06, \\"tn\\": 3.4323702555066e-05, \\"runoff\\": 0.04031885882106137, \\"et\\": 0.207, \\"inf\\": 4.352681141178938, \\"bod\\": 0.01101971503083698, \\"tss\\": 0.007045391577092494}, \\"c:developed_high\\": {\\"cell_count\\": 62, \\"tp\\": 0.19570010307442237, \\"tn\\": 1.2367159291508636, \\"runoff\\": 3.913763353234007, \\"et\\": 0.012419999999999999, \\"inf\\": 0.6738166467659927, \\"bod\\": 168.5195332029748, \\"tss\\": 34.36983060244543}}, \\"tp\\": 0.19570118698081884, \\"tn\\": 1.2367502528534187, \\"runoff\\": 3.4710839824439557, \\"et\\": 0.034657714285714285, \\"inf\\": 1.0942583032703295, \\"bod\\": 168.53055291800564, \\"tss\\": 34.37687599402253}, \\"a:deciduous_forest\\": {\\"cell_count\\": 30, \\"tp\\": 0.0, \\"tn\\": 0.0, \\"runoff\\": 0.0, \\"et\\": 0.14489999999999997, \\"inf\\": 4.4551, \\"bod\\": 0.0, \\"tss\\": 0.0}}, \\"tp\\": 0.19570118698081884, \\"tn\\": 1.2367502528534187, \\"runoff\\": 2.429758787710769, \\"et\\": 0.0677304, \\"inf\\": 2.1025108122892306, \\"bod\\": 168.53055291800564, \\"tss\\": 34.37687599402253}}, \\"census\\": {\\"cell_count\\": 100, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 70}, \\"a:deciduous_forest\\": {\\"cell_count\\": 30}}, \\"modification_hash\\": \\"87c42548da30fe1615eb6e6f5a3b0371\\", \\"modifications\\": [{\\"cell_count\\": 8, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 8}}, \\"reclassification\\": \\"a:shrub\\"}]}, \\"quality\\": [{\\"load\\": 168.53055291800564, \\"measure\\": \\"Biochemical Oxygen Demand\\"}, {\\"load\\": 34.37687599402253, \\"measure\\": \\"Total Suspended Solids\\"}, {\\"load\\": 1.2367502528534187, \\"measure\\": \\"Total Nitrogen\\"}, {\\"load\\": 0.19570118698081884, \\"measure\\": \\"Total Phosphorus\\"}]}", "error": ""}',
    getJobFailure: '{"started": "2015-07-14T21:46:01.997Z","finished": "2015-07-14T21:46:02.069Z", "job_uuid": "8aef636e-2079-4f87-98dc-471d090141ad", "status": "failed", "result": "", "error": "Some error occurred"}'
};

var scenarios = {
    sample: {
        "active": true,
        "census": {
            "cell_count": 100,
            "distribution": {
                "a:deciduous_forest": {
                    "cell_count": 30
                },
                "c:developed_high": {
                    "cell_count": 70
                }
            },
            "modification_hash": "87c42548da30fe1615eb6e6f5a3b0371",
            "modifications": [
                {
                    "cell_count": 8,
                    "distribution": {
                        "c:developed_high": {
                            "cell_count": 8
                        }
                    },
                    "reclassification": "a:shrub"
                }
            ]
        },
        "created_at": "2015-07-14T21:45:07.446363Z",
        "id": 120,
        "inputs": [
            {
                "area": "0",
                "name": "precipitation",
                "shape": null,
                "type": "",
                "units": "m<sup>2</sup>",
                "value": 4.6
            }
        ],
        "inputmod_hash": "d000ef136a6c566032ed84c487508ab287c42548da30fe1615eb6e6f5a3b0371",
        "is_current_conditions": false,
        "job_id": null,
        "modification_hash": "87c42548da30fe1615eb6e6f5a3b0371",
        "modifications": [
            {
                "area": 648.1614728140878,
                "name": "landcover",
                "shape": {
                    "geometry": {
                        "coordinates": [
                            [
                                [
                                    -75.1647502183914,
                                    39.95236473500341
                                ],
                                [
                                    -75.16454637050629,
                                    39.95232772476147
                                ],
                                [
                                    -75.16461610794067,
                                    39.952011080761736
                                ],
                                [
                                    -75.1648199558258,
                                    39.952031642104906
                                ],
                                [
                                    -75.1647502183914,
                                    39.95236473500341
                                ]
                            ]
                        ],
                        "type": "Polygon"
                    },
                    "properties": {},
                    "type": "Feature"
                },
                "type": "",
                "units": "m<sup>2</sup>",
                "value": "grassland"
            },
            {
                "area": 279.12201442036167,
                "name": "landcover",
                "shape": {
                    "geometry": {
                        "coordinates": [
                            [
                                [
                                    -75.16457855701447,
                                    39.953195404053794
                                ],
                                [
                                    -75.1643317937851,
                                    39.953166618661406
                                ],
                                [
                                    -75.16432106494904,
                                    39.95328176015835
                                ],
                                [
                                    -75.16454637050629,
                                    39.953322882074595
                                ],
                                [
                                    -75.16457855701447,
                                    39.953195404053794
                                ]
                            ]
                        ],
                        "type": "Polygon"
                    },
                    "properties": {},
                    "type": "Feature"
                },
                "type": "",
                "units": "m<sup>2</sup>",
                "value": "developed_high"
            }
        ],
        "modified_at": "2015-07-14T21:45:38.497360Z",
        "name": "New Scenario",
        "project": 63,
        "results": [
            {
                "displayName": "Runoff",
                "name": "runoff",
                "polling": false,
                "inputmod_hash": "d000ef136a6c566032ed84c487508ab287c42548da30fe1615eb6e6f5a3b0371",
                "result": {
                    "modified": {
                        "bod": 168.53055291800564,
                        "cell_count": 100,
                        "distribution": {
                            "a:deciduous_forest": {
                                "bod": 0,
                                "cell_count": 30,
                                "et": 0.14489999999999997,
                                "inf": 4.4551,
                                "runoff": 0,
                                "tn": 0,
                                "tp": 0,
                                "tss": 0
                            },
                            "c:developed_high": {
                                "bod": 168.53055291800564,
                                "cell_count": 70,
                                "distribution": {
                                    "a:shrub": {
                                        "bod": 0.01101971503083698,
                                        "cell_count": 8,
                                        "et": 0.207,
                                        "inf": 4.352681141178938,
                                        "runoff": 0.04031885882106137,
                                        "tn": 3.4323702555066e-05,
                                        "tp": 1.0839063964757685e-06,
                                        "tss": 0.007045391577092494
                                    },
                                    "c:developed_high": {
                                        "bod": 168.5195332029748,
                                        "cell_count": 62,
                                        "et": 0.012419999999999999,
                                        "inf": 0.6738166467659927,
                                        "runoff": 3.913763353234007,
                                        "tn": 1.2367159291508636,
                                        "tp": 0.19570010307442237,
                                        "tss": 34.36983060244543
                                    }
                                },
                                "et": 0.034657714285714285,
                                "inf": 1.0942583032703295,
                                "runoff": 3.4710839824439557,
                                "tn": 1.2367502528534187,
                                "tp": 0.19570118698081884,
                                "tss": 34.37687599402253
                            }
                        },
                        "et": 0.0677304,
                        "inf": 2.1025108122892306,
                        "modification_hash": "87c42548da30fe1615eb6e6f5a3b0371",
                        "runoff": 2.429758787710769,
                        "tn": 1.2367502528534187,
                        "tp": 0.19570118698081884,
                        "tss": 34.37687599402253
                    },
                    "unmodified": {
                        "bod": 190.26398910013282,
                        "cell_count": 100,
                        "distribution": {
                            "a:deciduous_forest": {
                                "bod": 0,
                                "cell_count": 30,
                                "et": 0.14489999999999997,
                                "inf": 4.4551,
                                "runoff": 0,
                                "tn": 0,
                                "tp": 0,
                                "tss": 0
                            },
                            "c:developed_high": {
                                "bod": 190.26398910013282,
                                "cell_count": 70,
                                "et": 0.012419999999999999,
                                "inf": 0.6738166467659927,
                                "runoff": 3.9137633532340064,
                                "tn": 1.3962921780735555,
                                "tp": 0.2209517292775736,
                                "tss": 38.804647454373864
                            }
                        },
                        "et": 0.052163999999999995,
                        "inf": 1.8082016527361946,
                        "modification_hash": "87c42548da30fe1615eb6e6f5a3b0371",
                        "runoff": 2.7396343472638045,
                        "tn": 1.3962921780735555,
                        "tp": 0.2209517292775736,
                        "tss": 38.804647454373864
                    }
                }
            },
            {
                "displayName": "Water Quality",
                "name": "quality",
                "polling": false,
                "inputmod_hash": "d000ef136a6c566032ed84c487508ab287c42548da30fe1615eb6e6f5a3b0371",
                "result": [
                    {
                        "load": 168.53055291800564,
                        "measure": "Biochemical Oxygen Demand"
                    },
                    {
                        "load": 34.37687599402253,
                        "measure": "Total Suspended Solids"
                    },
                    {
                        "load": 1.2367502528534187,
                        "measure": "Total Nitrogen"
                    },
                    {
                        "load": 0.19570118698081884,
                        "measure": "Total Phosphorus"
                    }
                ]
            }
        ],
        "taskModel": {
            "error": "",
            "finished": "2015-07-14T21:46:02.069Z",
            "job": "8aef636e-2079-4f87-98dc-471d090141ad",
            "job_uuid": "8aef636e-2079-4f87-98dc-471d090141ad",
            "pollInterval": 500,
            "result": "{\"runoff\": {\"unmodified\": {\"modification_hash\": \"87c42548da30fe1615eb6e6f5a3b0371\", \"cell_count\": 100, \"distribution\": {\"c:developed_high\": {\"cell_count\": 70, \"tp\": 0.2209517292775736, \"tn\": 1.3962921780735555, \"runoff\": 3.9137633532340064, \"et\": 0.012419999999999999, \"inf\": 0.6738166467659927, \"bod\": 190.26398910013282, \"tss\": 38.804647454373864}, \"a:deciduous_forest\": {\"cell_count\": 30, \"tp\": 0.0, \"tn\": 0.0, \"runoff\": 0.0, \"et\": 0.14489999999999997, \"inf\": 4.4551, \"bod\": 0.0, \"tss\": 0.0}}, \"tp\": 0.2209517292775736, \"tn\": 1.3962921780735555, \"runoff\": 2.7396343472638045, \"et\": 0.052163999999999995, \"inf\": 1.8082016527361946, \"bod\": 190.26398910013282, \"tss\": 38.804647454373864}, \"modified\": {\"modification_hash\": \"87c42548da30fe1615eb6e6f5a3b0371\", \"cell_count\": 100, \"distribution\": {\"c:developed_high\": {\"cell_count\": 70, \"distribution\": {\"a:shrub\": {\"cell_count\": 8, \"tp\": 1.0839063964757685e-06, \"tn\": 3.4323702555066e-05, \"runoff\": 0.04031885882106137, \"et\": 0.207, \"inf\": 4.352681141178938, \"bod\": 0.01101971503083698, \"tss\": 0.007045391577092494}, \"c:developed_high\": {\"cell_count\": 62, \"tp\": 0.19570010307442237, \"tn\": 1.2367159291508636, \"runoff\": 3.913763353234007, \"et\": 0.012419999999999999, \"inf\": 0.6738166467659927, \"bod\": 168.5195332029748, \"tss\": 34.36983060244543}}, \"tp\": 0.19570118698081884, \"tn\": 1.2367502528534187, \"runoff\": 3.4710839824439557, \"et\": 0.034657714285714285, \"inf\": 1.0942583032703295, \"bod\": 168.53055291800564, \"tss\": 34.37687599402253}, \"a:deciduous_forest\": {\"cell_count\": 30, \"tp\": 0.0, \"tn\": 0.0, \"runoff\": 0.0, \"et\": 0.14489999999999997, \"inf\": 4.4551, \"bod\": 0.0, \"tss\": 0.0}}, \"tp\": 0.19570118698081884, \"tn\": 1.2367502528534187, \"runoff\": 2.429758787710769, \"et\": 0.0677304, \"inf\": 2.1025108122892306, \"bod\": 168.53055291800564, \"tss\": 34.37687599402253}}, \"census\": {\"cell_count\": 100, \"distribution\": {\"c:developed_high\": {\"cell_count\": 70}, \"a:deciduous_forest\": {\"cell_count\": 30}}, \"modification_hash\": \"87c42548da30fe1615eb6e6f5a3b0371\", \"modifications\": [{\"cell_count\": 8, \"distribution\": {\"c:developed_high\": {\"cell_count\": 8}}, \"reclassification\": \"a:shrub\"}]}, \"quality\": [{\"load\": 168.53055291800564, \"measure\": \"Biochemical Oxygen Demand\"}, {\"load\": 34.37687599402253, \"measure\": \"Total Suspended Solids\"}, {\"load\": 1.2367502528534187, \"measure\": \"Total Nitrogen\"}, {\"load\": 0.19570118698081884, \"measure\": \"Total Phosphorus\"}]}",
            "started": "2015-07-14T21:46:01.997Z",
            "status": "complete",
            "taskName": "tr55",
            "taskType": "modeling",
            "timeout": 5000
        },
        "user_id": 1
    }
};

var polygons = {
    greaterThanOneAcre: {
        "features": [
            {
                "geometry": {
                    "coordinates": [
                        [
                            [
                                -75.17273247241974,
                                39.950349703806005
                            ],
                            [
                                -75.1707261800766,
                                39.95009473644421
                            ],
                            [
                                -75.17104804515839,
                                39.94857313726802
                            ],
                            [
                                -75.17302215099335,
                                39.94882399784062
                            ],
                            [
                                -75.17273247241974,
                                39.950349703806005
                            ]
                        ]
                    ],
                    "type": "Polygon"
                },
                "properties": {},
                "type": "Feature"
            }
        ],
        "type": "FeatureCollection"
    }
};

var modifications = {
    sample1: {
        "name":"Land Cover",
        "value":"developed_low",
        "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-76.00479125976562,40.19251207621169],[-76.04324340820312,40.13794057716276],[-75.95260620117188,40.136890695345905],[-75.93338012695312,40.182020964319086],[-75.96221923828125,40.199854889057676],[-76.00479125976562,40.19251207621169]]]}},
        "area":10977.041602204828,
        "units":"acres"
    },

    sample1OutOfOrder: {
        "area":10977.041602204828,
        "name":"Land Cover",
        "units":"acres",
        "shape":{"type":"Feature","geometry":{"coordinates":[[[-76.00479125976562,40.19251207621169],[-76.04324340820312,40.13794057716276],[-75.95260620117188,40.136890695345905],[-75.93338012695312,40.182020964319086],[-75.96221923828125,40.199854889057676],[-76.00479125976562,40.19251207621169]]], "type":"Polygon"},"properties":{}},
        "value":"developed_low"
    },

    sample2: {
        "name":"Conservation Practice",
        "value":"rain_garden",
        "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.53237915039062,40.18307014852534],[-75.66009521484375,40.107487419012415],[-75.50491333007812,40.10118506258701],[-75.43350219726561,40.13899044275822],[-75.42800903320312,40.1673306817866],[-75.53237915039062,40.18307014852534]]]}},
        "area":26292.18855342856,
        "units":"acres"
    },

    // Identical to sample1 except has a slightly smaller area
    sample3: {
        "name":"Land Cover",
        "value":"developed_low",
        "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-76.00479125976562,40.19252207621169],[-76.04324340820312,40.13794057716276],[-75.95260620117188,40.136890695345905],[-75.93338012695312,40.182020964319086],[-75.96221923828125,40.199854889057676],[-76.00479125976562,40.19251207621169]]]}},
        "area":10777.041602204828,
        "units":"acres"
    }
};

module.exports = {
    polling: polling,
    scenarios: scenarios,
    polygons: polygons,
    modifications: modifications
};

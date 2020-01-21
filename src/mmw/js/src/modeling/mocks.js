"use strict";

var polling = {
    getTR55Started: '{"status":"started", "job":"8aef636e-2079-4f87-98dc-471d090141ad"}',
    getJobSuccess: '{"started": "2015-07-14T21:46:01.997Z","finished": "2015-07-14T21:46:02.069Z", "job_uuid": "8aef636e-2079-4f87-98dc-471d090141ad", "status": "complete", "result": "{\\"runoff\\": {\\"unmodified\\": {\\"modification_hash\\": \\"87c42548da30fe1615eb6e6f5a3b0371\\", \\"cell_count\\": 100, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 70, \\"tp\\": 0.2209517292775736, \\"tn\\": 1.3962921780735555, \\"runoff\\": 3.9137633532340064, \\"et\\": 0.012419999999999999, \\"inf\\": 0.6738166467659927, \\"bod\\": 190.26398910013282, \\"tss\\": 38.804647454373864}, \\"a:deciduous_forest\\": {\\"cell_count\\": 30, \\"tp\\": 0.0, \\"tn\\": 0.0, \\"runoff\\": 0.0, \\"et\\": 0.14489999999999997, \\"inf\\": 4.4551, \\"bod\\": 0.0, \\"tss\\": 0.0}}, \\"tp\\": 0.2209517292775736, \\"tn\\": 1.3962921780735555, \\"runoff\\": 2.7396343472638045, \\"et\\": 0.052163999999999995, \\"inf\\": 1.8082016527361946, \\"bod\\": 190.26398910013282, \\"tss\\": 38.804647454373864}, \\"modified\\": {\\"modification_hash\\": \\"87c42548da30fe1615eb6e6f5a3b0371\\", \\"cell_count\\": 100, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 70, \\"distribution\\": {\\"a:shrub\\": {\\"cell_count\\": 8, \\"tp\\": 1.0839063964757685e-06, \\"tn\\": 3.4323702555066e-05, \\"runoff\\": 0.04031885882106137, \\"et\\": 0.207, \\"inf\\": 4.352681141178938, \\"bod\\": 0.01101971503083698, \\"tss\\": 0.007045391577092494}, \\"c:developed_high\\": {\\"cell_count\\": 62, \\"tp\\": 0.19570010307442237, \\"tn\\": 1.2367159291508636, \\"runoff\\": 3.913763353234007, \\"et\\": 0.012419999999999999, \\"inf\\": 0.6738166467659927, \\"bod\\": 168.5195332029748, \\"tss\\": 34.36983060244543}}, \\"tp\\": 0.19570118698081884, \\"tn\\": 1.2367502528534187, \\"runoff\\": 3.4710839824439557, \\"et\\": 0.034657714285714285, \\"inf\\": 1.0942583032703295, \\"bod\\": 168.53055291800564, \\"tss\\": 34.37687599402253}, \\"a:deciduous_forest\\": {\\"cell_count\\": 30, \\"tp\\": 0.0, \\"tn\\": 0.0, \\"runoff\\": 0.0, \\"et\\": 0.14489999999999997, \\"inf\\": 4.4551, \\"bod\\": 0.0, \\"tss\\": 0.0}}, \\"tp\\": 0.19570118698081884, \\"tn\\": 1.2367502528534187, \\"runoff\\": 2.429758787710769, \\"et\\": 0.0677304, \\"inf\\": 2.1025108122892306, \\"bod\\": 168.53055291800564, \\"tss\\": 34.37687599402253}}, \\"census\\": {\\"cell_count\\": 100, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 70}, \\"a:deciduous_forest\\": {\\"cell_count\\": 30}}, \\"modification_hash\\": \\"87c42548da30fe1615eb6e6f5a3b0371\\", \\"modifications\\": [{\\"cell_count\\": 8, \\"distribution\\": {\\"c:developed_high\\": {\\"cell_count\\": 8}}, \\"reclassification\\": \\"a:shrub\\"}]}, \\"quality\\": [{\\"load\\": 168.53055291800564, \\"measure\\": \\"Biochemical Oxygen Demand\\"}, {\\"load\\": 34.37687599402253, \\"measure\\": \\"Total Suspended Solids\\"}, {\\"load\\": 1.2367502528534187, \\"measure\\": \\"Total Nitrogen\\"}, {\\"load\\": 0.19570118698081884, \\"measure\\": \\"Total Phosphorus\\"}]}", "error": ""}',
    getJobFailure: '{"started": "2015-07-14T21:46:01.997Z","finished": "2015-07-14T21:46:02.069Z", "job_uuid": "8aef636e-2079-4f87-98dc-471d090141ad", "status": "failed", "result": "", "error": "Some error occurred"}'
};

var scenarios = {
    sample: {
        "id": 839,
        "inputs": [
            {
                "name": "precipitation",
                "area": "0",
                "effectiveUnits": null,
                "value": 0.984252,
                "shape": null,
                "effectiveShape": null,
                "units": "m²",
                "effectiveArea": null,
                "type": "",
                "isValidForAnalysis": false
            }
        ],

        "aoi_census": {
            "cell_count": 1110,
            "BMPs": null,
            "distribution": {
                "c:deciduous_forest": {
                    "cell_count": 570
                },
                "c:developed_open": {
                    "cell_count": 12
                },
                "b:deciduous_forest": {
                    "cell_count": 50
                },
                "b:developed_open": {
                    "cell_count": 3
                },
                "b:developed_low": {
                    "cell_count": 2
                },
                "c:evergreen_forest": {
                    "cell_count": 190
                },
                "c:grassland": {
                    "cell_count": 18
                },
                "b:grassland": {
                    "cell_count": 13
                },
                "c:developed_low": {
                    "cell_count": 1
                },
                "c:mixed_forest": {
                    "cell_count": 7
                },
                "b:pasture": {
                    "cell_count": 102
                },
                "c:pasture": {
                    "cell_count": 136
                },
                "b:evergreen_forest": {
                    "cell_count": 6
                }
            }
        },
        "modification_censuses": null,
        "results": [
            {
                "displayName": "Runoff",
                "name": "runoff",
                "inputmod_hash": "18ab2ee3dca78bfa88ce0e5e9cac73ecd751713988987e9331980363e24189ce",
                "activeVar": null,
                "result": {
                    "modification_hash": "d751713988987e9331980363e24189ce",
                    "aoi_census": {
                        "cell_count": 1110,
                        "BMPs": null,
                        "distribution": {
                            "c:deciduous_forest": {
                                "cell_count": 570
                            },
                            "c:developed_open": {
                                "cell_count": 12
                            },
                            "b:deciduous_forest": {
                                "cell_count": 50
                            },
                            "b:developed_open": {
                                "cell_count": 3
                            },
                            "b:developed_low": {
                                "cell_count": 2
                            },
                            "c:evergreen_forest": {
                                "cell_count": 190
                            },
                            "c:grassland": {
                                "cell_count": 18
                            },
                            "b:grassland": {
                                "cell_count": 13
                            },
                            "c:developed_low": {
                                "cell_count": 1
                            },
                            "c:mixed_forest": {
                                "cell_count": 7
                            },
                            "b:pasture": {
                                "cell_count": 102
                            },
                            "c:pasture": {
                                "cell_count": 136
                            },
                            "b:evergreen_forest": {
                                "cell_count": 6
                            }
                        }
                    },
                    "modification_censuses": [],
                    "inputmod_hash": "18ab2ee3dca78bfa88ce0e5e9cac73ecd751713988987e9331980363e24189ce",
                    "runoff": {
                        "pc_modified": {
                            "BMPs": null,
                            "inf": 1.9650996795809825,
                            "cell_count": 1110,
                            "tp": 0.023234766028064686,
                            "tn": 0.190783886995466,
                            "runoff": 0.007945684743342011,
                            "et": 0.5269547156756756,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:deciduous_forest": {
                                            "cell_count": 570,
                                            "tp": 0.013642150147106619,
                                            "tn": 0.11018659734201498,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.05246980825810238,
                                            "tss": 4.722282743229214
                                        }
                                    },
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 12,
                                    "tp": 0.0002872031609917182,
                                    "tn": 0.002319717838779263,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 12,
                                            "tp": 0.0002872031609917182,
                                            "tn": 0.002319717838779263,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0011046275422758394,
                                            "tss": 0.09941647880482556
                                        }
                                    },
                                    "bod": 0.0011046275422758394,
                                    "tss": 0.09941647880482556
                                },
                                "b:deciduous_forest": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:deciduous_forest": {
                                            "cell_count": 50,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_low": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 2,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:developed_low": {
                                            "cell_count": 2,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:evergreen_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:evergreen_forest": {
                                            "cell_count": 190,
                                            "tp": 0.004547383382368874,
                                            "tn": 0.03672886578067167,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.01748993608603413,
                                            "tss": 1.5740942477430715
                                        }
                                    },
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "c:grassland": {
                                    "inf": 1.9154271574434862,
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "c:grassland": {
                                            "cell_count": 18,
                                            "tp": 0.001311591405696853,
                                            "tn": 0.013712091968648917,
                                            "runoff": 0.006586819904139329,
                                            "et": 0.22356000000000004,
                                            "inf": 0.7541051800958607,
                                            "bod": 0.0029808895584019384,
                                            "tss": 0.2909348209000292
                                        }
                                    },
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:grassland": {
                                    "inf": 1.9321576800000002,
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "b:grassland": {
                                            "cell_count": 13,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.22356,
                                            "inf": 0.760692,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_open": {
                                    "inf": 1.9742200800000005,
                                    "cell_count": 3,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:developed_open": {
                                            "cell_count": 3,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.7772520000000002,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:mixed_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:mixed_forest": {
                                            "cell_count": 7,
                                            "tp": 0.00016753517724516902,
                                            "tn": 0.0013531687392879035,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0006443660663275732,
                                            "tss": 0.05799294596948158
                                        }
                                    },
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5257799999999999,
                                    "distribution": {
                                        "b:pasture": {
                                            "cell_count": 102,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.20699999999999996,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 1,
                                    "tp": 2.3933596749309858e-05,
                                    "tn": 0.0001933098198982719,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 1,
                                            "tp": 2.3933596749309858e-05,
                                            "tn": 0.0001933098198982719,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 9.20522951896533e-05,
                                            "tss": 0.008284706567068797
                                        }
                                    },
                                    "bod": 9.20522951896533e-05,
                                    "tss": 0.008284706567068797
                                },
                                "c:pasture": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 136,
                                    "tp": 0.003254969157906141,
                                    "tn": 0.026290135506164988,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:pasture": {
                                            "cell_count": 136,
                                            "tp": 0.003254969157906141,
                                            "tn": 0.026290135506164988,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.01251911214579285,
                                            "tss": 1.1267200931213563
                                        }
                                    },
                                    "bod": 0.01251911214579285,
                                    "tss": 1.1267200931213563
                                },
                                "b:evergreen_forest": {
                                    "inf": 1.9742200800000005,
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:evergreen_forest": {
                                            "cell_count": 6,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.7772520000000002,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 0.08730079195212437,
                            "tss": 7.879726036335047
                        },
                        "unmodified": {
                            "BMPs": null,
                            "inf": 1.9586814534290042,
                            "cell_count": 1110,
                            "tp": 0.15658117288902584,
                            "tn": 1.3858648079470084,
                            "runoff": 0.02118010386829332,
                            "et": 0.5201385227027028,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "cell_count": 12,
                                    "tp": 0.03622349082905331,
                                    "tn": 0.2558284039801889,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5240065556610105,
                                    "bod": 0.645230930392512,
                                    "tss": 11.297201202311
                                },
                                "c:grassland": {
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9154271574434862,
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:developed_open": {
                                    "cell_count": 3,
                                    "tp": 0.008073104824569256,
                                    "tn": 0.057016302823520375,
                                    "runoff": 0.4247911772296808,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5757179027703194,
                                    "bod": 0.1438021796876399,
                                    "tss": 2.517799567162537
                                },
                                "b:developed_low": {
                                    "cell_count": 2,
                                    "tp": 0.009132964949421495,
                                    "tn": 0.06200802518291435,
                                    "runoff": 0.6070218557883352,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6721506242116648,
                                    "bod": 0.1442047097277078,
                                    "tss": 3.028298904281864
                                },
                                "c:evergreen_forest": {
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "b:deciduous_forest": {
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:grassland": {
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9321576800000002,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "cell_count": 1,
                                    "tp": 0.004919761629035195,
                                    "tn": 0.03340259211292317,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6251892772543566,
                                    "bod": 0.07768044677423994,
                                    "tss": 1.6312893822590386
                                },
                                "c:mixed_forest": {
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.49949099999999996,
                                    "inf": 2.00050908,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:pasture": {
                                    "cell_count": 136,
                                    "tp": 0.07856319054452905,
                                    "tn": 0.815628760016838,
                                    "runoff": 0.05305467322445484,
                                    "et": 0.49949099999999996,
                                    "inf": 1.9474544067755453,
                                    "bod": 1.8569481401434142,
                                    "tss": 20.71211387083039
                                },
                                "b:evergreen_forest": {
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000005,
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 2.94145140669438,
                            "tss": 45.83200768468663
                        },
                        "modified": {
                            "BMPs": null,
                            "inf": 1.958681453429004,
                            "cell_count": 1110,
                            "tp": 0.15658117288902582,
                            "tn": 1.3858648079470084,
                            "runoff": 0.02118010386829332,
                            "et": 0.5201385227027026,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:deciduous_forest": {
                                            "cell_count": 570,
                                            "tp": 0.013642150147106619,
                                            "tn": 0.11018659734201498,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.05246980825810238,
                                            "tss": 4.722282743229214
                                        }
                                    },
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "inf": 1.5240065556610105,
                                    "cell_count": 12,
                                    "tp": 0.03622349082905331,
                                    "tn": 0.2558284039801889,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 12,
                                            "tp": 0.03622349082905331,
                                            "tn": 0.2558284039801889,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.645230930392512,
                                            "tss": 11.297201202311
                                        }
                                    },
                                    "bod": 0.645230930392512,
                                    "tss": 11.297201202311
                                },
                                "b:deciduous_forest": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:deciduous_forest": {
                                            "cell_count": 50,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_low": {
                                    "inf": 1.6721506242116648,
                                    "cell_count": 2,
                                    "tp": 0.009132964949421495,
                                    "tn": 0.06200802518291435,
                                    "runoff": 0.6070218557883352,
                                    "et": 0.22082759999999999,
                                    "distribution": {
                                        "b:developed_low": {
                                            "cell_count": 2,
                                            "tp": 0.009132964949421495,
                                            "tn": 0.06200802518291435,
                                            "runoff": 0.23898498259383275,
                                            "et": 0.08693999999999999,
                                            "inf": 0.6583270174061673,
                                            "bod": 0.1442047097277078,
                                            "tss": 3.028298904281864
                                        }
                                    },
                                    "bod": 0.1442047097277078,
                                    "tss": 3.028298904281864
                                },
                                "c:evergreen_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:evergreen_forest": {
                                            "cell_count": 190,
                                            "tp": 0.004547383382368874,
                                            "tn": 0.03672886578067167,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.01748993608603413,
                                            "tss": 1.5740942477430715
                                        }
                                    },
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "c:grassland": {
                                    "inf": 1.9154271574434862,
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "c:grassland": {
                                            "cell_count": 18,
                                            "tp": 0.001311591405696853,
                                            "tn": 0.013712091968648917,
                                            "runoff": 0.006586819904139329,
                                            "et": 0.22356000000000004,
                                            "inf": 0.7541051800958607,
                                            "bod": 0.0029808895584019384,
                                            "tss": 0.2909348209000292
                                        }
                                    },
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:grassland": {
                                    "inf": 1.9321576800000002,
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "b:grassland": {
                                            "cell_count": 13,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.22356,
                                            "inf": 0.760692,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_open": {
                                    "inf": 1.5757179027703194,
                                    "cell_count": 3,
                                    "tp": 0.008073104824569256,
                                    "tn": 0.057016302823520375,
                                    "runoff": 0.4247911772296808,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "b:developed_open": {
                                            "cell_count": 3,
                                            "tp": 0.008073104824569256,
                                            "tn": 0.057016302823520375,
                                            "runoff": 0.16724062095656725,
                                            "et": 0.19665,
                                            "inf": 0.6203613790434328,
                                            "bod": 0.1438021796876399,
                                            "tss": 2.517799567162537
                                        }
                                    },
                                    "bod": 0.1438021796876399,
                                    "tss": 2.517799567162537
                                },
                                "c:mixed_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:mixed_forest": {
                                            "cell_count": 7,
                                            "tp": 0.00016753517724516902,
                                            "tn": 0.0013531687392879035,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0006443660663275732,
                                            "tss": 0.05799294596948158
                                        }
                                    },
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "inf": 2.00050908,
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "b:pasture": {
                                            "cell_count": 102,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.19665,
                                            "inf": 0.787602,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "inf": 1.6251892772543566,
                                    "cell_count": 1,
                                    "tp": 0.004919761629035195,
                                    "tn": 0.03340259211292317,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 1,
                                            "tp": 0.004919761629035195,
                                            "tn": 0.03340259211292317,
                                            "runoff": 0.25747370186836366,
                                            "et": 0.08693999999999999,
                                            "inf": 0.6398382981316364,
                                            "bod": 0.07768044677423994,
                                            "tss": 1.6312893822590386
                                        }
                                    },
                                    "bod": 0.07768044677423994,
                                    "tss": 1.6312893822590386
                                },
                                "c:pasture": {
                                    "inf": 1.9474544067755453,
                                    "cell_count": 136,
                                    "tp": 0.07856319054452905,
                                    "tn": 0.815628760016838,
                                    "runoff": 0.05305467322445484,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "c:pasture": {
                                            "cell_count": 136,
                                            "tp": 0.07856319054452905,
                                            "tn": 0.815628760016838,
                                            "runoff": 0.020887666623801118,
                                            "et": 0.19665,
                                            "inf": 0.7667143333761989,
                                            "bod": 1.8569481401434142,
                                            "tss": 20.71211387083039
                                        }
                                    },
                                    "bod": 1.8569481401434142,
                                    "tss": 20.71211387083039
                                },
                                "b:evergreen_forest": {
                                    "inf": 1.9742200800000005,
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:evergreen_forest": {
                                            "cell_count": 6,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.7772520000000002,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 2.94145140669438,
                            "tss": 45.83200768468663
                        },
                        "pc_unmodified": {
                            "BMPs": null,
                            "inf": 1.9650996795809825,
                            "cell_count": 1110,
                            "tp": 0.023234766028064686,
                            "tn": 0.19078388699546597,
                            "runoff": 0.007945684743342011,
                            "et": 0.5269547156756755,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "cell_count": 12,
                                    "tp": 0.0002872031609917182,
                                    "tn": 0.002319717838779263,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0011046275422758394,
                                    "tss": 0.09941647880482556
                                },
                                "c:grassland": {
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9154271574434862,
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:developed_open": {
                                    "cell_count": 3,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000005,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_low": {
                                    "cell_count": 2,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:evergreen_forest": {
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "b:deciduous_forest": {
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:grassland": {
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9321576800000002,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "cell_count": 1,
                                    "tp": 2.3933596749309858e-05,
                                    "tn": 0.0001933098198982719,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 9.20522951896533e-05,
                                    "tss": 0.008284706567068797
                                },
                                "c:mixed_forest": {
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5257799999999999,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:pasture": {
                                    "cell_count": 136,
                                    "tp": 0.003254969157906141,
                                    "tn": 0.026290135506164988,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.01251911214579285,
                                    "tss": 1.1267200931213563
                                },
                                "b:evergreen_forest": {
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000005,
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 0.08730079195212437,
                            "tss": 7.879726036335047
                        }
                    },
                    "quality": {
                        "pc_modified": [
                            {
                                "load": 3.5741806922732864,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.08653804487004742,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.010539103992201917,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "unmodified": [
                            {
                                "load": 20.789032029712377,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.6286171899662994,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.071023967373079,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "modified": [
                            {
                                "load": 20.789032029712377,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.6286171899662994,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.07102396737307899,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "pc_unmodified": [
                            {
                                "load": 3.5741806922732864,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.0865380448700474,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.010539103992201917,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Phosphorus"
                            }
                        ]
                    }
                },
                "polling": false,
                "active": false
            },
            {
                "displayName": "Water Quality",
                "name": "quality",
                "inputmod_hash": "18ab2ee3dca78bfa88ce0e5e9cac73ecd751713988987e9331980363e24189ce",
                "activeVar": null,
                "result": {
                    "modification_hash": "d751713988987e9331980363e24189ce",
                    "aoi_census": {
                        "cell_count": 1110,
                        "BMPs": null,
                        "distribution": {
                            "c:deciduous_forest": {
                                "cell_count": 570
                            },
                            "c:developed_open": {
                                "cell_count": 12
                            },
                            "b:deciduous_forest": {
                                "cell_count": 50
                            },
                            "b:developed_open": {
                                "cell_count": 3
                            },
                            "b:developed_low": {
                                "cell_count": 2
                            },
                            "c:evergreen_forest": {
                                "cell_count": 190
                            },
                            "c:grassland": {
                                "cell_count": 18
                            },
                            "b:grassland": {
                                "cell_count": 13
                            },
                            "c:developed_low": {
                                "cell_count": 1
                            },
                            "c:mixed_forest": {
                                "cell_count": 7
                            },
                            "b:pasture": {
                                "cell_count": 102
                            },
                            "c:pasture": {
                                "cell_count": 136
                            },
                            "b:evergreen_forest": {
                                "cell_count": 6
                            }
                        }
                    },
                    "modification_censuses": [],
                    "inputmod_hash": "18ab2ee3dca78bfa88ce0e5e9cac73ecd751713988987e9331980363e24189ce",
                    "runoff": {
                        "pc_modified": {
                            "BMPs": null,
                            "inf": 1.9650996795809825,
                            "cell_count": 1110,
                            "tp": 0.023234766028064686,
                            "tn": 0.190783886995466,
                            "runoff": 0.007945684743342011,
                            "et": 0.5269547156756756,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:deciduous_forest": {
                                            "cell_count": 570,
                                            "tp": 0.013642150147106619,
                                            "tn": 0.11018659734201498,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.05246980825810238,
                                            "tss": 4.722282743229214
                                        }
                                    },
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 12,
                                    "tp": 0.0002872031609917182,
                                    "tn": 0.002319717838779263,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 12,
                                            "tp": 0.0002872031609917182,
                                            "tn": 0.002319717838779263,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0011046275422758394,
                                            "tss": 0.09941647880482556
                                        }
                                    },
                                    "bod": 0.0011046275422758394,
                                    "tss": 0.09941647880482556
                                },
                                "b:deciduous_forest": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:deciduous_forest": {
                                            "cell_count": 50,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_low": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 2,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:developed_low": {
                                            "cell_count": 2,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:evergreen_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:evergreen_forest": {
                                            "cell_count": 190,
                                            "tp": 0.004547383382368874,
                                            "tn": 0.03672886578067167,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.01748993608603413,
                                            "tss": 1.5740942477430715
                                        }
                                    },
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "c:grassland": {
                                    "inf": 1.9154271574434862,
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "c:grassland": {
                                            "cell_count": 18,
                                            "tp": 0.001311591405696853,
                                            "tn": 0.013712091968648917,
                                            "runoff": 0.006586819904139329,
                                            "et": 0.22356000000000004,
                                            "inf": 0.7541051800958607,
                                            "bod": 0.0029808895584019384,
                                            "tss": 0.2909348209000292
                                        }
                                    },
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:grassland": {
                                    "inf": 1.9321576800000002,
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "b:grassland": {
                                            "cell_count": 13,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.22356,
                                            "inf": 0.760692,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_open": {
                                    "inf": 1.9742200800000005,
                                    "cell_count": 3,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:developed_open": {
                                            "cell_count": 3,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.7772520000000002,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:mixed_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:mixed_forest": {
                                            "cell_count": 7,
                                            "tp": 0.00016753517724516902,
                                            "tn": 0.0013531687392879035,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0006443660663275732,
                                            "tss": 0.05799294596948158
                                        }
                                    },
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5257799999999999,
                                    "distribution": {
                                        "b:pasture": {
                                            "cell_count": 102,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.20699999999999996,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 1,
                                    "tp": 2.3933596749309858e-05,
                                    "tn": 0.0001933098198982719,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 1,
                                            "tp": 2.3933596749309858e-05,
                                            "tn": 0.0001933098198982719,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 9.20522951896533e-05,
                                            "tss": 0.008284706567068797
                                        }
                                    },
                                    "bod": 9.20522951896533e-05,
                                    "tss": 0.008284706567068797
                                },
                                "c:pasture": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 136,
                                    "tp": 0.003254969157906141,
                                    "tn": 0.026290135506164988,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:pasture": {
                                            "cell_count": 136,
                                            "tp": 0.003254969157906141,
                                            "tn": 0.026290135506164988,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.01251911214579285,
                                            "tss": 1.1267200931213563
                                        }
                                    },
                                    "bod": 0.01251911214579285,
                                    "tss": 1.1267200931213563
                                },
                                "b:evergreen_forest": {
                                    "inf": 1.9742200800000005,
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:evergreen_forest": {
                                            "cell_count": 6,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.7772520000000002,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 0.08730079195212437,
                            "tss": 7.879726036335047
                        },
                        "unmodified": {
                            "BMPs": null,
                            "inf": 1.9586814534290042,
                            "cell_count": 1110,
                            "tp": 0.15658117288902584,
                            "tn": 1.3858648079470084,
                            "runoff": 0.02118010386829332,
                            "et": 0.5201385227027028,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "cell_count": 12,
                                    "tp": 0.03622349082905331,
                                    "tn": 0.2558284039801889,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5240065556610105,
                                    "bod": 0.645230930392512,
                                    "tss": 11.297201202311
                                },
                                "c:grassland": {
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9154271574434862,
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:developed_open": {
                                    "cell_count": 3,
                                    "tp": 0.008073104824569256,
                                    "tn": 0.057016302823520375,
                                    "runoff": 0.4247911772296808,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5757179027703194,
                                    "bod": 0.1438021796876399,
                                    "tss": 2.517799567162537
                                },
                                "b:developed_low": {
                                    "cell_count": 2,
                                    "tp": 0.009132964949421495,
                                    "tn": 0.06200802518291435,
                                    "runoff": 0.6070218557883352,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6721506242116648,
                                    "bod": 0.1442047097277078,
                                    "tss": 3.028298904281864
                                },
                                "c:evergreen_forest": {
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "b:deciduous_forest": {
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:grassland": {
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9321576800000002,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "cell_count": 1,
                                    "tp": 0.004919761629035195,
                                    "tn": 0.03340259211292317,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6251892772543566,
                                    "bod": 0.07768044677423994,
                                    "tss": 1.6312893822590386
                                },
                                "c:mixed_forest": {
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.49949099999999996,
                                    "inf": 2.00050908,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:pasture": {
                                    "cell_count": 136,
                                    "tp": 0.07856319054452905,
                                    "tn": 0.815628760016838,
                                    "runoff": 0.05305467322445484,
                                    "et": 0.49949099999999996,
                                    "inf": 1.9474544067755453,
                                    "bod": 1.8569481401434142,
                                    "tss": 20.71211387083039
                                },
                                "b:evergreen_forest": {
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000005,
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 2.94145140669438,
                            "tss": 45.83200768468663
                        },
                        "modified": {
                            "BMPs": null,
                            "inf": 1.958681453429004,
                            "cell_count": 1110,
                            "tp": 0.15658117288902582,
                            "tn": 1.3858648079470084,
                            "runoff": 0.02118010386829332,
                            "et": 0.5201385227027026,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:deciduous_forest": {
                                            "cell_count": 570,
                                            "tp": 0.013642150147106619,
                                            "tn": 0.11018659734201498,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.05246980825810238,
                                            "tss": 4.722282743229214
                                        }
                                    },
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "inf": 1.5240065556610105,
                                    "cell_count": 12,
                                    "tp": 0.03622349082905331,
                                    "tn": 0.2558284039801889,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 12,
                                            "tp": 0.03622349082905331,
                                            "tn": 0.2558284039801889,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.645230930392512,
                                            "tss": 11.297201202311
                                        }
                                    },
                                    "bod": 0.645230930392512,
                                    "tss": 11.297201202311
                                },
                                "b:deciduous_forest": {
                                    "inf": 1.9742200800000003,
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:deciduous_forest": {
                                            "cell_count": 50,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.777252,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_low": {
                                    "inf": 1.6721506242116648,
                                    "cell_count": 2,
                                    "tp": 0.009132964949421495,
                                    "tn": 0.06200802518291435,
                                    "runoff": 0.6070218557883352,
                                    "et": 0.22082759999999999,
                                    "distribution": {
                                        "b:developed_low": {
                                            "cell_count": 2,
                                            "tp": 0.009132964949421495,
                                            "tn": 0.06200802518291435,
                                            "runoff": 0.23898498259383275,
                                            "et": 0.08693999999999999,
                                            "inf": 0.6583270174061673,
                                            "bod": 0.1442047097277078,
                                            "tss": 3.028298904281864
                                        }
                                    },
                                    "bod": 0.1442047097277078,
                                    "tss": 3.028298904281864
                                },
                                "c:evergreen_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:evergreen_forest": {
                                            "cell_count": 190,
                                            "tp": 0.004547383382368874,
                                            "tn": 0.03672886578067167,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.01748993608603413,
                                            "tss": 1.5740942477430715
                                        }
                                    },
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "c:grassland": {
                                    "inf": 1.9154271574434862,
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "c:grassland": {
                                            "cell_count": 18,
                                            "tp": 0.001311591405696853,
                                            "tn": 0.013712091968648917,
                                            "runoff": 0.006586819904139329,
                                            "et": 0.22356000000000004,
                                            "inf": 0.7541051800958607,
                                            "bod": 0.0029808895584019384,
                                            "tss": 0.2909348209000292
                                        }
                                    },
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:grassland": {
                                    "inf": 1.9321576800000002,
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "distribution": {
                                        "b:grassland": {
                                            "cell_count": 13,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.22356,
                                            "inf": 0.760692,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_open": {
                                    "inf": 1.5757179027703194,
                                    "cell_count": 3,
                                    "tp": 0.008073104824569256,
                                    "tn": 0.057016302823520375,
                                    "runoff": 0.4247911772296808,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "b:developed_open": {
                                            "cell_count": 3,
                                            "tp": 0.008073104824569256,
                                            "tn": 0.057016302823520375,
                                            "runoff": 0.16724062095656725,
                                            "et": 0.19665,
                                            "inf": 0.6203613790434328,
                                            "bod": 0.1438021796876399,
                                            "tss": 2.517799567162537
                                        }
                                    },
                                    "bod": 0.1438021796876399,
                                    "tss": 2.517799567162537
                                },
                                "c:mixed_forest": {
                                    "inf": 1.9649203412892005,
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "distribution": {
                                        "c:mixed_forest": {
                                            "cell_count": 7,
                                            "tp": 0.00016753517724516902,
                                            "tn": 0.0013531687392879035,
                                            "runoff": 0.003661314453070686,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0006443660663275732,
                                            "tss": 0.05799294596948158
                                        }
                                    },
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "inf": 2.00050908,
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "b:pasture": {
                                            "cell_count": 102,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.19665,
                                            "inf": 0.787602,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "inf": 1.6251892772543566,
                                    "cell_count": 1,
                                    "tp": 0.004919761629035195,
                                    "tn": 0.03340259211292317,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 1,
                                            "tp": 0.004919761629035195,
                                            "tn": 0.03340259211292317,
                                            "runoff": 0.25747370186836366,
                                            "et": 0.08693999999999999,
                                            "inf": 0.6398382981316364,
                                            "bod": 0.07768044677423994,
                                            "tss": 1.6312893822590386
                                        }
                                    },
                                    "bod": 0.07768044677423994,
                                    "tss": 1.6312893822590386
                                },
                                "c:pasture": {
                                    "inf": 1.9474544067755453,
                                    "cell_count": 136,
                                    "tp": 0.07856319054452905,
                                    "tn": 0.815628760016838,
                                    "runoff": 0.05305467322445484,
                                    "et": 0.49949099999999996,
                                    "distribution": {
                                        "c:pasture": {
                                            "cell_count": 136,
                                            "tp": 0.07856319054452905,
                                            "tn": 0.815628760016838,
                                            "runoff": 0.020887666623801118,
                                            "et": 0.19665,
                                            "inf": 0.7667143333761989,
                                            "bod": 1.8569481401434142,
                                            "tss": 20.71211387083039
                                        }
                                    },
                                    "bod": 1.8569481401434142,
                                    "tss": 20.71211387083039
                                },
                                "b:evergreen_forest": {
                                    "inf": 1.9742200800000005,
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "distribution": {
                                        "b:evergreen_forest": {
                                            "cell_count": 6,
                                            "tp": 0,
                                            "tn": 0,
                                            "runoff": 0,
                                            "et": 0.207,
                                            "inf": 0.7772520000000002,
                                            "bod": 0,
                                            "tss": 0
                                        }
                                    },
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 2.94145140669438,
                            "tss": 45.83200768468663
                        },
                        "pc_unmodified": {
                            "BMPs": null,
                            "inf": 1.9650996795809825,
                            "cell_count": 1110,
                            "tp": 0.023234766028064686,
                            "tn": 0.19078388699546597,
                            "runoff": 0.007945684743342011,
                            "et": 0.5269547156756755,
                            "distribution": {
                                "c:deciduous_forest": {
                                    "cell_count": 570,
                                    "tp": 0.013642150147106619,
                                    "tn": 0.11018659734201498,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.05246980825810238,
                                    "tss": 4.722282743229214
                                },
                                "c:developed_open": {
                                    "cell_count": 12,
                                    "tp": 0.0002872031609917182,
                                    "tn": 0.002319717838779263,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0011046275422758394,
                                    "tss": 0.09941647880482556
                                },
                                "c:grassland": {
                                    "cell_count": 18,
                                    "tp": 0.001311591405696853,
                                    "tn": 0.013712091968648917,
                                    "runoff": 0.016730522556513895,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9154271574434862,
                                    "bod": 0.0029808895584019384,
                                    "tss": 0.2909348209000292
                                },
                                "b:developed_open": {
                                    "cell_count": 3,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000005,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:developed_low": {
                                    "cell_count": 2,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:evergreen_forest": {
                                    "cell_count": 190,
                                    "tp": 0.004547383382368874,
                                    "tn": 0.03672886578067167,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.01748993608603413,
                                    "tss": 1.5740942477430715
                                },
                                "b:deciduous_forest": {
                                    "cell_count": 50,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "b:grassland": {
                                    "cell_count": 13,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5678424000000001,
                                    "inf": 1.9321576800000002,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:developed_low": {
                                    "cell_count": 1,
                                    "tp": 2.3933596749309858e-05,
                                    "tn": 0.0001933098198982719,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 9.20522951896533e-05,
                                    "tss": 0.008284706567068797
                                },
                                "c:mixed_forest": {
                                    "cell_count": 7,
                                    "tp": 0.00016753517724516902,
                                    "tn": 0.0013531687392879035,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0006443660663275732,
                                    "tss": 0.05799294596948158
                                },
                                "b:pasture": {
                                    "cell_count": 102,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.5257799999999999,
                                    "inf": 1.9742200800000003,
                                    "bod": 0,
                                    "tss": 0
                                },
                                "c:pasture": {
                                    "cell_count": 136,
                                    "tp": 0.003254969157906141,
                                    "tn": 0.026290135506164988,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.01251911214579285,
                                    "tss": 1.1267200931213563
                                },
                                "b:evergreen_forest": {
                                    "cell_count": 6,
                                    "tp": 0,
                                    "tn": 0,
                                    "runoff": 0,
                                    "et": 0.52578,
                                    "inf": 1.9742200800000005,
                                    "bod": 0,
                                    "tss": 0
                                }
                            },
                            "bod": 0.08730079195212437,
                            "tss": 7.879726036335047
                        }
                    },
                    "quality": {
                        "pc_modified": [
                            {
                                "load": 3.5741806922732864,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.08653804487004742,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.010539103992201917,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "unmodified": [
                            {
                                "load": 20.789032029712377,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.6286171899662994,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.071023967373079,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "modified": [
                            {
                                "load": 20.789032029712377,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.6286171899662994,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.07102396737307899,
                                "runoff": 0.02118010386829332,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "pc_unmodified": [
                            {
                                "load": 3.5741806922732864,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.0865380448700474,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.010539103992201917,
                                "runoff": 0.007945684743342011,
                                "measure": "Total Phosphorus"
                            }
                        ]
                    }
                },
                "polling": false,
                "active": false
            }
        ],
        "name": "New Scenario",
        "is_current_conditions": false,
        "inputmod_hash": "18ab2ee3dca78bfa88ce0e5e9cac73ecd751713988987e9331980363e24189ce",
        "modification_hash": "d751713988987e9331980363e24189ce",
        "created_at": "2017-10-02T21:05:58.984931Z",
        "modified_at": "2017-10-02T21:05:58.984958Z",
        "project": 440,
        "user_id": 5,
        "active": false,
        "job_id": null,
        "poll_error": null,
        "allow_save": true,
        "options_menu_is_open": false,
        "taskModel": {
            "taskName": "tr55",
            "taskType": "mmw/modeling",
            "pollInterval": 1000,
            "timeout": 45000
        }
},
    tr55SquareKm: {
        "is_current_conditions": false,
        "name": "New Scenario",
        "aoi_census": {
            "cell_count": 1112,
            "BMPs": {
                "developed_open": 12349.754371359115
            },
            "distribution": {
                "c:developed_open": {
                    "cell_count": 2
                },
                "c:developed_low": {
                    "cell_count": 15
                },
                "c:developed_high": {
                    "cell_count": 923
                },
                "c:developed_med": {
                    "cell_count": 172
                }
            }
        },
        "results": [
            {
                "name": "runoff",
                "displayName": "Runoff",
                "result": {
                    "modification_hash": "0393bb9819e65c1cb0500989881ad209",
                    "aoi_census": {
                        "cell_count": 1112,
                        "BMPs": {
                            "developed_open": 12349.754371359115
                        },
                        "distribution": {
                            "c:developed_open": {
                                "cell_count": 2
                            },
                            "c:developed_low": {
                                "cell_count": 15
                            },
                            "c:developed_high": {
                                "cell_count": 923
                            },
                            "c:developed_med": {
                                "cell_count": 172
                            }
                        }
                    },
                    "modification_censuses": [
                        {
                            "cell_count": 16,
                            "distribution": {
                                "c:developed_high": {
                                    "cell_count": 10
                                },
                                "c:developed_med": {
                                    "cell_count": 6
                                }
                            },
                            "change": ":developed_open:"
                        }
                    ],
                    "inputmod_hash": "c41c79294c722aac7febf21a5bfc95e70393bb9819e65c1cb0500989881ad209",
                    "runoff": {
                        "pc_modified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 2,
                                            "tp": 0.00004783748785466694,
                                            "tn": 0.00038637970959538685,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.00018399033790256515,
                                            "tss": 0.016559130411230864
                                        }
                                    },
                                    "tp": 0.00004783748785466694,
                                    "tn": 0.00038637970959538685,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.00018399033790256515,
                                    "tss": 0.016559130411230864
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 15,
                                            "tp": 0.00035878115891000204,
                                            "tn": 0.002897847821965401,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0013799275342692386,
                                            "tss": 0.12419347808423147
                                        }
                                    },
                                    "tp": 0.00035878115891000204,
                                    "tn": 0.002897847821965401,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0013799275342692386,
                                    "tss": 0.12419347808423147
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 10,
                                            "tp": 0.00023918743927333464,
                                            "tn": 0.0019318985479769336,
                                            "runoff": 0.0036613144530706853,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0009199516895128255,
                                            "tss": 0.0827956520561543
                                        },
                                        "c:developed_high": {
                                            "cell_count": 913,
                                            "tp": 0.021837813205655456,
                                            "tn": 0.17638233743029405,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.08399158925252098,
                                            "tss": 7.559243032726887
                                        }
                                    },
                                    "tp": 0.02207700064492879,
                                    "tn": 0.17831423597827098,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892002,
                                    "bod": 0.0849115409420338,
                                    "tss": 7.642038684783041
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 6,
                                            "tp": 0.0001435124635640008,
                                            "tn": 0.0011591391287861603,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0005519710137076953,
                                            "tss": 0.04967739123369258
                                        },
                                        "c:developed_med": {
                                            "cell_count": 166,
                                            "tp": 0.003970511491937356,
                                            "tn": 0.0320695158964171,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.20699999999999996,
                                            "inf": 0.7735906855469294,
                                            "bod": 0.015271198045912905,
                                            "tss": 1.3744078241321616
                                        }
                                    },
                                    "tp": 0.0041140239555013565,
                                    "tn": 0.03322865502520326,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.5257799999999999,
                                    "inf": 1.964920341289201,
                                    "bod": 0.0158231690596206,
                                    "tss": 1.424085215365854
                                }
                            },
                            "tp": 0.026597643247194817,
                            "tn": 0.21482711853503503,
                            "runoff": 0.009299738710799543,
                            "et": 0.5257799999999999,
                            "inf": 1.9649203412892005,
                            "bod": 0.10229862787382621,
                            "tss": 9.206876508644358
                        },
                        "unmodified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "tp": 0.006033501847977378,
                                    "tn": 0.04261160680134023,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5240065556610105,
                                    "bod": 0.10747175166709706,
                                    "tss": 1.8816983888379446
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "tp": 0.07375062750972043,
                                    "tn": 0.5007279446712598,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6251892772543566,
                                    "bod": 1.1644835922587438,
                                    "tss": 24.454155437433617
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "tp": 10.976138963416943,
                                    "tn": 111.0158055157028,
                                    "runoff": 1.7173372140456984,
                                    "et": 0.0315468,
                                    "inf": 0.7511160659543017,
                                    "bod": 310.4679306795079,
                                    "tss": 5133.696995175295
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "tp": 1.526015137663621,
                                    "tn": 14.53730210090081,
                                    "runoff": 1.1801101013998858,
                                    "et": 0.09464039999999999,
                                    "inf": 1.2252495786001143,
                                    "bod": 36.142463786769966,
                                    "tss": 540.9322080086572
                                }
                            },
                            "tp": 12.581938230438261,
                            "tn": 126.0964471680762,
                            "runoff": 1.6176654128550563,
                            "et": 0.04470075647482014,
                            "inf": 0.8376339106701237,
                            "bod": 347.8823498102037,
                            "tss": 5700.965057010224
                        },
                        "modified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 2,
                                            "tp": 0.006033501847977378,
                                            "tn": 0.04261160680134023,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.10747175166709706,
                                            "tss": 1.8816983888379446
                                        }
                                    },
                                    "tp": 0.006033501847977378,
                                    "tn": 0.04261160680134023,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5240065556610105,
                                    "bod": 0.10747175166709706,
                                    "tss": 1.8816983888379446
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 15,
                                            "tp": 0.07375062750972043,
                                            "tn": 0.5007279446712598,
                                            "runoff": 0.25747370186836366,
                                            "et": 0.08693999999999999,
                                            "inf": 0.6398382981316364,
                                            "bod": 1.1644835922587438,
                                            "tss": 24.454155437433617
                                        }
                                    },
                                    "tp": 0.07375062750972043,
                                    "tn": 0.5007279446712598,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6251892772543566,
                                    "bod": 1.1644835922587438,
                                    "tss": 24.454155437433617
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 10,
                                            "tp": 0.03016750923988689,
                                            "tn": 0.21305803400670112,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.5373587583354852,
                                            "tss": 9.408491944189723
                                        },
                                        "c:developed_high": {
                                            "cell_count": 913,
                                            "tp": 10.857220881473097,
                                            "tn": 109.81303405832793,
                                            "runoff": 0.6761170134038182,
                                            "et": 0.012419999999999999,
                                            "inf": 0.29571498659618173,
                                            "bod": 307.1042477902391,
                                            "tss": 5078.077309420418
                                        }
                                    },
                                    "tp": 10.887388390712983,
                                    "tn": 110.02609209233464,
                                    "runoff": 1.7038937179492009,
                                    "et": 0.03661661798483207,
                                    "inf": 0.7594897440659669,
                                    "bod": 307.6416065485746,
                                    "tss": 5087.485801364607
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 6,
                                            "tp": 0.018100505543932135,
                                            "tn": 0.12783482040402067,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.32241525500129115,
                                            "tss": 5.645095166513834
                                        },
                                        "c:developed_med": {
                                            "cell_count": 166,
                                            "tp": 1.4727820514660526,
                                            "tn": 14.030186911334502,
                                            "runoff": 0.4646102761416873,
                                            "et": 0.037259999999999995,
                                            "inf": 0.4823817238583127,
                                            "bod": 34.881680166301244,
                                            "tss": 522.0624798223085
                                        }
                                    },
                                    "tp": 1.4908825570099846,
                                    "tn": 14.158021731738522,
                                    "runoff": 1.1555656510372962,
                                    "et": 0.10876309534883719,
                                    "inf": 1.2356713336138665,
                                    "bod": 35.20409542130253,
                                    "tss": 527.7075749888223
                                }
                            },
                            "tp": 12.458055077080665,
                            "tn": 124.72745337554576,
                            "runoff": 1.602710383754847,
                            "et": 0.051093333453237404,
                            "inf": 0.8461963627919155,
                            "bod": 344.117657313803,
                            "tss": 5641.529230179702
                        },
                        "pc_unmodified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "tp": 0.00004783748785466694,
                                    "tn": 0.00038637970959538685,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.00018399033790256515,
                                    "tss": 0.016559130411230864
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "tp": 0.00035878115891000204,
                                    "tn": 0.002897847821965401,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0013799275342692386,
                                    "tss": 0.12419347808423147
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "tp": 0.022077000644928787,
                                    "tn": 0.17831423597827098,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0849115409420338,
                                    "tss": 7.642038684783042
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "tp": 0.0041140239555013565,
                                    "tn": 0.033228655025203266,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892002,
                                    "bod": 0.0158231690596206,
                                    "tss": 1.4240852153658543
                                }
                            },
                            "tp": 0.026597643247194814,
                            "tn": 0.21482711853503506,
                            "runoff": 0.009299738710799543,
                            "et": 0.5257799999999999,
                            "inf": 1.964920341289201,
                            "bod": 0.10229862787382621,
                            "tss": 9.206876508644358
                        }
                    },
                    "quality": {
                        "pc_modified": [
                            {
                                "load": 4.176165529309012,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.09744386235054361,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.012064478195781592,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "unmodified": [
                            {
                                "load": 2585.9121421393816,
                                "runoff": 1.6176654128550563,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 57.19633966386202,
                                "runoff": 1.6176654128550563,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 5.707066525820951,
                                "runoff": 1.6176654128550563,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "modified": [
                            {
                                "load": 2558.952526575671,
                                "runoff": 1.602710383754847,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 56.57537503152055,
                                "runoff": 1.602710383754847,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 5.6508741185231735,
                                "runoff": 1.602710383754847,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "pc_unmodified": [
                            {
                                "load": 4.176165529309012,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.09744386235054361,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.01206447819578159,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Phosphorus"
                            }
                        ]
                    }
                },
                "inputmod_hash": "c41c79294c722aac7febf21a5bfc95e70393bb9819e65c1cb0500989881ad209",
                "polling": false,
                "error": null,
                "active": false,
                "activeVar": null
            },
            {
                "name": "quality",
                "displayName": "Water Quality",
                "result": {
                    "modification_hash": "0393bb9819e65c1cb0500989881ad209",
                    "aoi_census": {
                        "cell_count": 1112,
                        "BMPs": {
                            "developed_open": 12349.754371359115
                        },
                        "distribution": {
                            "c:developed_open": {
                                "cell_count": 2
                            },
                            "c:developed_low": {
                                "cell_count": 15
                            },
                            "c:developed_high": {
                                "cell_count": 923
                            },
                            "c:developed_med": {
                                "cell_count": 172
                            }
                        }
                    },
                    "modification_censuses": [
                        {
                            "cell_count": 16,
                            "distribution": {
                                "c:developed_high": {
                                    "cell_count": 10
                                },
                                "c:developed_med": {
                                    "cell_count": 6
                                }
                            },
                            "change": ":developed_open:"
                        }
                    ],
                    "inputmod_hash": "c41c79294c722aac7febf21a5bfc95e70393bb9819e65c1cb0500989881ad209",
                    "runoff": {
                        "pc_modified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 2,
                                            "tp": 0.00004783748785466694,
                                            "tn": 0.00038637970959538685,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.00018399033790256515,
                                            "tss": 0.016559130411230864
                                        }
                                    },
                                    "tp": 0.00004783748785466694,
                                    "tn": 0.00038637970959538685,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.00018399033790256515,
                                    "tss": 0.016559130411230864
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 15,
                                            "tp": 0.00035878115891000204,
                                            "tn": 0.002897847821965401,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0013799275342692386,
                                            "tss": 0.12419347808423147
                                        }
                                    },
                                    "tp": 0.00035878115891000204,
                                    "tn": 0.002897847821965401,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0013799275342692386,
                                    "tss": 0.12419347808423147
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 10,
                                            "tp": 0.00023918743927333464,
                                            "tn": 0.0019318985479769336,
                                            "runoff": 0.0036613144530706853,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0009199516895128255,
                                            "tss": 0.0827956520561543
                                        },
                                        "c:developed_high": {
                                            "cell_count": 913,
                                            "tp": 0.021837813205655456,
                                            "tn": 0.17638233743029405,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.08399158925252098,
                                            "tss": 7.559243032726887
                                        }
                                    },
                                    "tp": 0.02207700064492879,
                                    "tn": 0.17831423597827098,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892002,
                                    "bod": 0.0849115409420338,
                                    "tss": 7.642038684783041
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 6,
                                            "tp": 0.0001435124635640008,
                                            "tn": 0.0011591391287861603,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.207,
                                            "inf": 0.7735906855469293,
                                            "bod": 0.0005519710137076953,
                                            "tss": 0.04967739123369258
                                        },
                                        "c:developed_med": {
                                            "cell_count": 166,
                                            "tp": 0.003970511491937356,
                                            "tn": 0.0320695158964171,
                                            "runoff": 0.0036613144530706857,
                                            "et": 0.20699999999999996,
                                            "inf": 0.7735906855469294,
                                            "bod": 0.015271198045912905,
                                            "tss": 1.3744078241321616
                                        }
                                    },
                                    "tp": 0.0041140239555013565,
                                    "tn": 0.03322865502520326,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.5257799999999999,
                                    "inf": 1.964920341289201,
                                    "bod": 0.0158231690596206,
                                    "tss": 1.424085215365854
                                }
                            },
                            "tp": 0.026597643247194817,
                            "tn": 0.21482711853503503,
                            "runoff": 0.009299738710799543,
                            "et": 0.5257799999999999,
                            "inf": 1.9649203412892005,
                            "bod": 0.10229862787382621,
                            "tss": 9.206876508644358
                        },
                        "unmodified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "tp": 0.006033501847977378,
                                    "tn": 0.04261160680134023,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5240065556610105,
                                    "bod": 0.10747175166709706,
                                    "tss": 1.8816983888379446
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "tp": 0.07375062750972043,
                                    "tn": 0.5007279446712598,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6251892772543566,
                                    "bod": 1.1644835922587438,
                                    "tss": 24.454155437433617
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "tp": 10.976138963416943,
                                    "tn": 111.0158055157028,
                                    "runoff": 1.7173372140456984,
                                    "et": 0.0315468,
                                    "inf": 0.7511160659543017,
                                    "bod": 310.4679306795079,
                                    "tss": 5133.696995175295
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "tp": 1.526015137663621,
                                    "tn": 14.53730210090081,
                                    "runoff": 1.1801101013998858,
                                    "et": 0.09464039999999999,
                                    "inf": 1.2252495786001143,
                                    "bod": 36.142463786769966,
                                    "tss": 540.9322080086572
                                }
                            },
                            "tp": 12.581938230438261,
                            "tn": 126.0964471680762,
                            "runoff": 1.6176654128550563,
                            "et": 0.04470075647482014,
                            "inf": 0.8376339106701237,
                            "bod": 347.8823498102037,
                            "tss": 5700.965057010224
                        },
                        "modified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "distribution": {
                                        "c:developed_open": {
                                            "cell_count": 2,
                                            "tp": 0.006033501847977378,
                                            "tn": 0.04261160680134023,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.10747175166709706,
                                            "tss": 1.8816983888379446
                                        }
                                    },
                                    "tp": 0.006033501847977378,
                                    "tn": 0.04261160680134023,
                                    "runoff": 0.47650252433898943,
                                    "et": 0.49949099999999996,
                                    "inf": 1.5240065556610105,
                                    "bod": 0.10747175166709706,
                                    "tss": 1.8816983888379446
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "distribution": {
                                        "c:developed_low": {
                                            "cell_count": 15,
                                            "tp": 0.07375062750972043,
                                            "tn": 0.5007279446712598,
                                            "runoff": 0.25747370186836366,
                                            "et": 0.08693999999999999,
                                            "inf": 0.6398382981316364,
                                            "bod": 1.1644835922587438,
                                            "tss": 24.454155437433617
                                        }
                                    },
                                    "tp": 0.07375062750972043,
                                    "tn": 0.5007279446712598,
                                    "runoff": 0.6539832027456437,
                                    "et": 0.22082759999999999,
                                    "inf": 1.6251892772543566,
                                    "bod": 1.1644835922587438,
                                    "tss": 24.454155437433617
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 10,
                                            "tp": 0.03016750923988689,
                                            "tn": 0.21305803400670112,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.5373587583354852,
                                            "tss": 9.408491944189723
                                        },
                                        "c:developed_high": {
                                            "cell_count": 913,
                                            "tp": 10.857220881473097,
                                            "tn": 109.81303405832793,
                                            "runoff": 0.6761170134038182,
                                            "et": 0.012419999999999999,
                                            "inf": 0.29571498659618173,
                                            "bod": 307.1042477902391,
                                            "tss": 5078.077309420418
                                        }
                                    },
                                    "tp": 10.887388390712983,
                                    "tn": 110.02609209233464,
                                    "runoff": 1.7038937179492009,
                                    "et": 0.03661661798483207,
                                    "inf": 0.7594897440659669,
                                    "bod": 307.6416065485746,
                                    "tss": 5087.485801364607
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "distribution": {
                                        "c:developed_open:": {
                                            "cell_count": 6,
                                            "tp": 0.018100505543932135,
                                            "tn": 0.12783482040402067,
                                            "runoff": 0.1875994190310982,
                                            "et": 0.19665,
                                            "inf": 0.6000025809689018,
                                            "bod": 0.32241525500129115,
                                            "tss": 5.645095166513834
                                        },
                                        "c:developed_med": {
                                            "cell_count": 166,
                                            "tp": 1.4727820514660526,
                                            "tn": 14.030186911334502,
                                            "runoff": 0.4646102761416873,
                                            "et": 0.037259999999999995,
                                            "inf": 0.4823817238583127,
                                            "bod": 34.881680166301244,
                                            "tss": 522.0624798223085
                                        }
                                    },
                                    "tp": 1.4908825570099846,
                                    "tn": 14.158021731738522,
                                    "runoff": 1.1555656510372962,
                                    "et": 0.10876309534883719,
                                    "inf": 1.2356713336138665,
                                    "bod": 35.20409542130253,
                                    "tss": 527.7075749888223
                                }
                            },
                            "tp": 12.458055077080665,
                            "tn": 124.72745337554576,
                            "runoff": 1.602710383754847,
                            "et": 0.051093333453237404,
                            "inf": 0.8461963627919155,
                            "bod": 344.117657313803,
                            "tss": 5641.529230179702
                        },
                        "pc_unmodified": {
                            "BMPs": {
                                "developed_open": 12349.754371359115
                            },
                            "cell_count": 1112,
                            "distribution": {
                                "c:developed_open": {
                                    "cell_count": 2,
                                    "tp": 0.00004783748785466694,
                                    "tn": 0.00038637970959538685,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.00018399033790256515,
                                    "tss": 0.016559130411230864
                                },
                                "c:developed_low": {
                                    "cell_count": 15,
                                    "tp": 0.00035878115891000204,
                                    "tn": 0.002897847821965401,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0013799275342692386,
                                    "tss": 0.12419347808423147
                                },
                                "c:developed_high": {
                                    "cell_count": 923,
                                    "tp": 0.022077000644928787,
                                    "tn": 0.17831423597827098,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892005,
                                    "bod": 0.0849115409420338,
                                    "tss": 7.642038684783042
                                },
                                "c:developed_med": {
                                    "cell_count": 172,
                                    "tp": 0.0041140239555013565,
                                    "tn": 0.033228655025203266,
                                    "runoff": 0.009299738710799543,
                                    "et": 0.52578,
                                    "inf": 1.9649203412892002,
                                    "bod": 0.0158231690596206,
                                    "tss": 1.4240852153658543
                                }
                            },
                            "tp": 0.026597643247194814,
                            "tn": 0.21482711853503506,
                            "runoff": 0.009299738710799543,
                            "et": 0.5257799999999999,
                            "inf": 1.964920341289201,
                            "bod": 0.10229862787382621,
                            "tss": 9.206876508644358
                        }
                    },
                    "quality": {
                        "pc_modified": [
                            {
                                "load": 4.176165529309012,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.09744386235054361,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.012064478195781592,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "unmodified": [
                            {
                                "load": 2585.9121421393816,
                                "runoff": 1.6176654128550563,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 57.19633966386202,
                                "runoff": 1.6176654128550563,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 5.707066525820951,
                                "runoff": 1.6176654128550563,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "modified": [
                            {
                                "load": 2558.952526575671,
                                "runoff": 1.602710383754847,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 56.57537503152055,
                                "runoff": 1.602710383754847,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 5.6508741185231735,
                                "runoff": 1.602710383754847,
                                "measure": "Total Phosphorus"
                            }
                        ],
                        "pc_unmodified": [
                            {
                                "load": 4.176165529309012,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Suspended Solids"
                            },
                            {
                                "load": 0.09744386235054361,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Nitrogen"
                            },
                            {
                                "load": 0.01206447819578159,
                                "runoff": 0.009299738710799543,
                                "measure": "Total Phosphorus"
                            }
                        ]
                    }
                },
                "inputmod_hash": "c41c79294c722aac7febf21a5bfc95e70393bb9819e65c1cb0500989881ad209",
                "polling": false,
                "error": null,
                "active": false,
                "activeVar": null
            }
        ],
        "inputmod_hash": "c41c79294c722aac7febf21a5bfc95e70393bb9819e65c1cb0500989881ad209",
        "inputs": [
            {
                "name": "precipitation",
                "value": 0.984252,
                "type": "",
                "effectiveArea": null,
                "effectiveUnits": null,
                "effectiveShape": null,
                "shape": null,
                "area": "0",
                "units": "m²",
                "isValidForAnalysis": false
            }
        ],
        "user_id": 2,
        "modifications": [
            {
                "name": "landcover",
                "value": "developed_open",
                "shape": {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [
                                    -75.16628980636597,
                                    39.954737460938695
                                ],
                                [
                                    -75.16491651535034,
                                    39.95462232189238
                                ],
                                [
                                    -75.16525983810425,
                                    39.953635407829914
                                ],
                                [
                                    -75.16656875610352,
                                    39.9538656890516
                                ],
                                [
                                    -75.16628980636597,
                                    39.954737460938695
                                ]
                            ]
                        ]
                    }
                },
                "type": "",
                "effectiveArea": 12349.754371359115,
                "effectiveUnits": "m²",
                "effectiveShape": {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [
                                    -75.16628980636597,
                                    39.954737460938695
                                ],
                                [
                                    -75.16491651535034,
                                    39.95462232189238
                                ],
                                [
                                    -75.16525983810425,
                                    39.953635407829914
                                ],
                                [
                                    -75.16656875610352,
                                    39.9538656890516
                                ],
                                [
                                    -75.16628980636597,
                                    39.954737460938695
                                ]
                            ]
                        ]
                    }
                },
                "area": 12349.754371359115,
                "units": "m²",
                "isValidForAnalysis": true
            }
        ],
        "modification_hash": "0393bb9819e65c1cb0500989881ad209",
        "active": true,
        "is_subbasin_active": false,
        "job_id": null,
        "poll_error": null,
        "modification_censuses": {
            "modification_hash": "0393bb9819e65c1cb0500989881ad209",
            "censuses": [
                {
                    "cell_count": 16,
                    "distribution": {
                        "c:developed_high": {
                            "cell_count": 10
                        },
                        "c:developed_med": {
                            "cell_count": 6
                        }
                    },
                    "change": ":developed_open:"
                }
            ]
        },
        "allow_save": true,
        "options_menu_is_open": false,
        "taskModel": {
            "taskName": "tr55",
            "taskType": "mmw/modeling",
            "pollInterval": 1000,
            "timeout": 160000,
            "job": "c39dcdb7-3077-4b42-a3da-ef043ee83b98",
            "result": {
                "modification_hash": "0393bb9819e65c1cb0500989881ad209",
                "aoi_census": {
                    "cell_count": 1112,
                    "BMPs": {
                        "developed_open": 12349.754371359115
                    },
                    "distribution": {
                        "c:developed_open": {
                            "cell_count": 2
                        },
                        "c:developed_low": {
                            "cell_count": 15
                        },
                        "c:developed_high": {
                            "cell_count": 923
                        },
                        "c:developed_med": {
                            "cell_count": 172
                        }
                    }
                },
                "modification_censuses": [
                    {
                        "cell_count": 16,
                        "distribution": {
                            "c:developed_high": {
                                "cell_count": 10
                            },
                            "c:developed_med": {
                                "cell_count": 6
                            }
                        },
                        "change": ":developed_open:"
                    }
                ],
                "inputmod_hash": "c41c79294c722aac7febf21a5bfc95e70393bb9819e65c1cb0500989881ad209",
                "runoff": {
                    "pc_modified": {
                        "BMPs": {
                            "developed_open": 12349.754371359115
                        },
                        "cell_count": 1112,
                        "distribution": {
                            "c:developed_open": {
                                "cell_count": 2,
                                "distribution": {
                                    "c:developed_open": {
                                        "cell_count": 2,
                                        "tp": 0.00004783748785466694,
                                        "tn": 0.00038637970959538685,
                                        "runoff": 0.0036613144530706857,
                                        "et": 0.207,
                                        "inf": 0.7735906855469293,
                                        "bod": 0.00018399033790256515,
                                        "tss": 0.016559130411230864
                                    }
                                },
                                "tp": 0.00004783748785466694,
                                "tn": 0.00038637970959538685,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892005,
                                "bod": 0.00018399033790256515,
                                "tss": 0.016559130411230864
                            },
                            "c:developed_low": {
                                "cell_count": 15,
                                "distribution": {
                                    "c:developed_low": {
                                        "cell_count": 15,
                                        "tp": 0.00035878115891000204,
                                        "tn": 0.002897847821965401,
                                        "runoff": 0.0036613144530706857,
                                        "et": 0.207,
                                        "inf": 0.7735906855469293,
                                        "bod": 0.0013799275342692386,
                                        "tss": 0.12419347808423147
                                    }
                                },
                                "tp": 0.00035878115891000204,
                                "tn": 0.002897847821965401,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892005,
                                "bod": 0.0013799275342692386,
                                "tss": 0.12419347808423147
                            },
                            "c:developed_high": {
                                "cell_count": 923,
                                "distribution": {
                                    "c:developed_open:": {
                                        "cell_count": 10,
                                        "tp": 0.00023918743927333464,
                                        "tn": 0.0019318985479769336,
                                        "runoff": 0.0036613144530706853,
                                        "et": 0.207,
                                        "inf": 0.7735906855469293,
                                        "bod": 0.0009199516895128255,
                                        "tss": 0.0827956520561543
                                    },
                                    "c:developed_high": {
                                        "cell_count": 913,
                                        "tp": 0.021837813205655456,
                                        "tn": 0.17638233743029405,
                                        "runoff": 0.0036613144530706857,
                                        "et": 0.207,
                                        "inf": 0.7735906855469293,
                                        "bod": 0.08399158925252098,
                                        "tss": 7.559243032726887
                                    }
                                },
                                "tp": 0.02207700064492879,
                                "tn": 0.17831423597827098,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892002,
                                "bod": 0.0849115409420338,
                                "tss": 7.642038684783041
                            },
                            "c:developed_med": {
                                "cell_count": 172,
                                "distribution": {
                                    "c:developed_open:": {
                                        "cell_count": 6,
                                        "tp": 0.0001435124635640008,
                                        "tn": 0.0011591391287861603,
                                        "runoff": 0.0036613144530706857,
                                        "et": 0.207,
                                        "inf": 0.7735906855469293,
                                        "bod": 0.0005519710137076953,
                                        "tss": 0.04967739123369258
                                    },
                                    "c:developed_med": {
                                        "cell_count": 166,
                                        "tp": 0.003970511491937356,
                                        "tn": 0.0320695158964171,
                                        "runoff": 0.0036613144530706857,
                                        "et": 0.20699999999999996,
                                        "inf": 0.7735906855469294,
                                        "bod": 0.015271198045912905,
                                        "tss": 1.3744078241321616
                                    }
                                },
                                "tp": 0.0041140239555013565,
                                "tn": 0.03322865502520326,
                                "runoff": 0.009299738710799543,
                                "et": 0.5257799999999999,
                                "inf": 1.964920341289201,
                                "bod": 0.0158231690596206,
                                "tss": 1.424085215365854
                            }
                        },
                        "tp": 0.026597643247194817,
                        "tn": 0.21482711853503503,
                        "runoff": 0.009299738710799543,
                        "et": 0.5257799999999999,
                        "inf": 1.9649203412892005,
                        "bod": 0.10229862787382621,
                        "tss": 9.206876508644358
                    },
                    "unmodified": {
                        "BMPs": {
                            "developed_open": 12349.754371359115
                        },
                        "cell_count": 1112,
                        "distribution": {
                            "c:developed_open": {
                                "cell_count": 2,
                                "tp": 0.006033501847977378,
                                "tn": 0.04261160680134023,
                                "runoff": 0.47650252433898943,
                                "et": 0.49949099999999996,
                                "inf": 1.5240065556610105,
                                "bod": 0.10747175166709706,
                                "tss": 1.8816983888379446
                            },
                            "c:developed_low": {
                                "cell_count": 15,
                                "tp": 0.07375062750972043,
                                "tn": 0.5007279446712598,
                                "runoff": 0.6539832027456437,
                                "et": 0.22082759999999999,
                                "inf": 1.6251892772543566,
                                "bod": 1.1644835922587438,
                                "tss": 24.454155437433617
                            },
                            "c:developed_high": {
                                "cell_count": 923,
                                "tp": 10.976138963416943,
                                "tn": 111.0158055157028,
                                "runoff": 1.7173372140456984,
                                "et": 0.0315468,
                                "inf": 0.7511160659543017,
                                "bod": 310.4679306795079,
                                "tss": 5133.696995175295
                            },
                            "c:developed_med": {
                                "cell_count": 172,
                                "tp": 1.526015137663621,
                                "tn": 14.53730210090081,
                                "runoff": 1.1801101013998858,
                                "et": 0.09464039999999999,
                                "inf": 1.2252495786001143,
                                "bod": 36.142463786769966,
                                "tss": 540.9322080086572
                            }
                        },
                        "tp": 12.581938230438261,
                        "tn": 126.0964471680762,
                        "runoff": 1.6176654128550563,
                        "et": 0.04470075647482014,
                        "inf": 0.8376339106701237,
                        "bod": 347.8823498102037,
                        "tss": 5700.965057010224
                    },
                    "modified": {
                        "BMPs": {
                            "developed_open": 12349.754371359115
                        },
                        "cell_count": 1112,
                        "distribution": {
                            "c:developed_open": {
                                "cell_count": 2,
                                "distribution": {
                                    "c:developed_open": {
                                        "cell_count": 2,
                                        "tp": 0.006033501847977378,
                                        "tn": 0.04261160680134023,
                                        "runoff": 0.1875994190310982,
                                        "et": 0.19665,
                                        "inf": 0.6000025809689018,
                                        "bod": 0.10747175166709706,
                                        "tss": 1.8816983888379446
                                    }
                                },
                                "tp": 0.006033501847977378,
                                "tn": 0.04261160680134023,
                                "runoff": 0.47650252433898943,
                                "et": 0.49949099999999996,
                                "inf": 1.5240065556610105,
                                "bod": 0.10747175166709706,
                                "tss": 1.8816983888379446
                            },
                            "c:developed_low": {
                                "cell_count": 15,
                                "distribution": {
                                    "c:developed_low": {
                                        "cell_count": 15,
                                        "tp": 0.07375062750972043,
                                        "tn": 0.5007279446712598,
                                        "runoff": 0.25747370186836366,
                                        "et": 0.08693999999999999,
                                        "inf": 0.6398382981316364,
                                        "bod": 1.1644835922587438,
                                        "tss": 24.454155437433617
                                    }
                                },
                                "tp": 0.07375062750972043,
                                "tn": 0.5007279446712598,
                                "runoff": 0.6539832027456437,
                                "et": 0.22082759999999999,
                                "inf": 1.6251892772543566,
                                "bod": 1.1644835922587438,
                                "tss": 24.454155437433617
                            },
                            "c:developed_high": {
                                "cell_count": 923,
                                "distribution": {
                                    "c:developed_open:": {
                                        "cell_count": 10,
                                        "tp": 0.03016750923988689,
                                        "tn": 0.21305803400670112,
                                        "runoff": 0.1875994190310982,
                                        "et": 0.19665,
                                        "inf": 0.6000025809689018,
                                        "bod": 0.5373587583354852,
                                        "tss": 9.408491944189723
                                    },
                                    "c:developed_high": {
                                        "cell_count": 913,
                                        "tp": 10.857220881473097,
                                        "tn": 109.81303405832793,
                                        "runoff": 0.6761170134038182,
                                        "et": 0.012419999999999999,
                                        "inf": 0.29571498659618173,
                                        "bod": 307.1042477902391,
                                        "tss": 5078.077309420418
                                    }
                                },
                                "tp": 10.887388390712983,
                                "tn": 110.02609209233464,
                                "runoff": 1.7038937179492009,
                                "et": 0.03661661798483207,
                                "inf": 0.7594897440659669,
                                "bod": 307.6416065485746,
                                "tss": 5087.485801364607
                            },
                            "c:developed_med": {
                                "cell_count": 172,
                                "distribution": {
                                    "c:developed_open:": {
                                        "cell_count": 6,
                                        "tp": 0.018100505543932135,
                                        "tn": 0.12783482040402067,
                                        "runoff": 0.1875994190310982,
                                        "et": 0.19665,
                                        "inf": 0.6000025809689018,
                                        "bod": 0.32241525500129115,
                                        "tss": 5.645095166513834
                                    },
                                    "c:developed_med": {
                                        "cell_count": 166,
                                        "tp": 1.4727820514660526,
                                        "tn": 14.030186911334502,
                                        "runoff": 0.4646102761416873,
                                        "et": 0.037259999999999995,
                                        "inf": 0.4823817238583127,
                                        "bod": 34.881680166301244,
                                        "tss": 522.0624798223085
                                    }
                                },
                                "tp": 1.4908825570099846,
                                "tn": 14.158021731738522,
                                "runoff": 1.1555656510372962,
                                "et": 0.10876309534883719,
                                "inf": 1.2356713336138665,
                                "bod": 35.20409542130253,
                                "tss": 527.7075749888223
                            }
                        },
                        "tp": 12.458055077080665,
                        "tn": 124.72745337554576,
                        "runoff": 1.602710383754847,
                        "et": 0.051093333453237404,
                        "inf": 0.8461963627919155,
                        "bod": 344.117657313803,
                        "tss": 5641.529230179702
                    },
                    "pc_unmodified": {
                        "BMPs": {
                            "developed_open": 12349.754371359115
                        },
                        "cell_count": 1112,
                        "distribution": {
                            "c:developed_open": {
                                "cell_count": 2,
                                "tp": 0.00004783748785466694,
                                "tn": 0.00038637970959538685,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892005,
                                "bod": 0.00018399033790256515,
                                "tss": 0.016559130411230864
                            },
                            "c:developed_low": {
                                "cell_count": 15,
                                "tp": 0.00035878115891000204,
                                "tn": 0.002897847821965401,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892005,
                                "bod": 0.0013799275342692386,
                                "tss": 0.12419347808423147
                            },
                            "c:developed_high": {
                                "cell_count": 923,
                                "tp": 0.022077000644928787,
                                "tn": 0.17831423597827098,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892005,
                                "bod": 0.0849115409420338,
                                "tss": 7.642038684783042
                            },
                            "c:developed_med": {
                                "cell_count": 172,
                                "tp": 0.0041140239555013565,
                                "tn": 0.033228655025203266,
                                "runoff": 0.009299738710799543,
                                "et": 0.52578,
                                "inf": 1.9649203412892002,
                                "bod": 0.0158231690596206,
                                "tss": 1.4240852153658543
                            }
                        },
                        "tp": 0.026597643247194814,
                        "tn": 0.21482711853503506,
                        "runoff": 0.009299738710799543,
                        "et": 0.5257799999999999,
                        "inf": 1.964920341289201,
                        "bod": 0.10229862787382621,
                        "tss": 9.206876508644358
                    }
                },
                "quality": {
                    "pc_modified": [
                        {
                            "load": 4.176165529309012,
                            "runoff": 0.009299738710799543,
                            "measure": "Total Suspended Solids"
                        },
                        {
                            "load": 0.09744386235054361,
                            "runoff": 0.009299738710799543,
                            "measure": "Total Nitrogen"
                        },
                        {
                            "load": 0.012064478195781592,
                            "runoff": 0.009299738710799543,
                            "measure": "Total Phosphorus"
                        }
                    ],
                    "unmodified": [
                        {
                            "load": 2585.9121421393816,
                            "runoff": 1.6176654128550563,
                            "measure": "Total Suspended Solids"
                        },
                        {
                            "load": 57.19633966386202,
                            "runoff": 1.6176654128550563,
                            "measure": "Total Nitrogen"
                        },
                        {
                            "load": 5.707066525820951,
                            "runoff": 1.6176654128550563,
                            "measure": "Total Phosphorus"
                        }
                    ],
                    "modified": [
                        {
                            "load": 2558.952526575671,
                            "runoff": 1.602710383754847,
                            "measure": "Total Suspended Solids"
                        },
                        {
                            "load": 56.57537503152055,
                            "runoff": 1.602710383754847,
                            "measure": "Total Nitrogen"
                        },
                        {
                            "load": 5.6508741185231735,
                            "runoff": 1.602710383754847,
                            "measure": "Total Phosphorus"
                        }
                    ],
                    "pc_unmodified": [
                        {
                            "load": 4.176165529309012,
                            "runoff": 0.009299738710799543,
                            "measure": "Total Suspended Solids"
                        },
                        {
                            "load": 0.09744386235054361,
                            "runoff": 0.009299738710799543,
                            "measure": "Total Nitrogen"
                        },
                        {
                            "load": 0.01206447819578159,
                            "runoff": 0.009299738710799543,
                            "measure": "Total Phosphorus"
                        }
                    ]
                }
            },
            "status": "complete",
            "started": "2018-11-28T17:56:23.651Z",
            "finished": "2018-11-28T17:56:24.374Z",
            "error": "",
            "job_uuid": "c39dcdb7-3077-4b42-a3da-ef043ee83b98"
        },
        "project": 50,
        "id": 97,
        "created_at": "2018-11-28T17:56:03.792951Z",
        "modified_at": "2018-11-28T17:56:25.043419Z"
    },
    subbasin: {
        "id": 93,
        "inputs": [],
        "modifications": [
            {
                "modKey": "conservation_tillage",
                "userInput": {
                    "areaToModify": "2500"
                },
                "output": {
                    "n65": 0.08,
                    "n73": 0.22,
                    "n81": 0.3,
                    "CN__1": 66.8318246591936,
                    "n26": 74.22057094008434
                }
            }
        ],
        "modification_censuses": {},
        "results": [
            {
                "displayName": "Hydrology",
                "name": "runoff",
                "inputmod_hash": "d751713988987e9331980363e24189cea81d1d89a4d53c28e2b08a846af045de",
                "activeVar": "AvStreamFlow",
                "result": {
                    "MeanFlow": 10717549462.372944,
                    "monthly": [
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 0.5729185779496173,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 7.924799999999999,
                            "AvRunoff": 1.5764158854187598,
                            "AvGroundWater": 4.567045135421832,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 179.95550831565558
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 0.8723196977686928,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 7.248736666666668,
                            "AvRunoff": 1.5432040990842377,
                            "AvGroundWater": 4.755148669036126,
                            "AvPtSrcFlow": 156.99152658886518,
                            "AvStreamFlow": 163.28987935698555
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 2.53036925461453,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.751993333333331,
                            "AvRunoff": 1.4252179033280579,
                            "AvGroundWater": 5.586474616820065,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 180.82373981496312
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 5.043670083970272,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.906509999999999,
                            "AvRunoff": 0.34566348012861875,
                            "AvGroundWater": 5.338279660414788,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 173.8891502000418
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 9.1054511679753,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 9.634643333333335,
                            "AvRunoff": 0.37918415577614806,
                            "AvGroundWater": 3.7631363658883448,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 177.95436781647948
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 11.277727715806732,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 9.25576,
                            "AvRunoff": 0.43632925367370257,
                            "AvGroundWater": 2.009002660260069,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 170.65053897343216
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 10.564844817895892,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 10.811933333333334,
                            "AvRunoff": 0.7350328344530752,
                            "AvGroundWater": 0.9354855879503674,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 175.48256571721842
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 8.829383678649409,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 9.152890000000001,
                            "AvRunoff": 0.4791458131445576,
                            "AvGroundWater": 0.3865234816565334,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 174.67771658961607
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 5.491126335327011,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.694420000000003,
                            "AvRunoff": 0.5529687664550647,
                            "AvGroundWater": 0.440411826103213,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 169.19858765205666
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 4.0166013322744485,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 6.980766666666666,
                            "AvRunoff": 0.5949684700997341,
                            "AvGroundWater": 0.6988805790186436,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 175.10589634393335
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 2.2133938575650953,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.39724,
                            "AvRunoff": 1.0126495252635856,
                            "AvGroundWater": 1.3094287193573628,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 170.52728530411932
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 1.0746429207378023,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.713893333333337,
                            "AvRunoff": 1.3489735648205943,
                            "AvGroundWater": 3.301715542625604,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 178.46273640226119
                        }
                    ],
                    "watershed_id": null,
                    "meta": {
                        "NRur": 10,
                        "SedDelivRatio": 0.06411293669858417,
                        "NLU": 16,
                        "NUrb": 6,
                        "WxYrBeg": 1961,
                        "NYrs": 30,
                        "WxYrEnd": 1990
                    },
                    "MeanFlowPerSecond": 339.851264027554,
                    "inputmod_hash": "d751713988987e9331980363e24189cea81d1d89a4d53c28e2b08a846af045de",
                    "AreaTotal": 51279.7,
                    "SummaryLoads": [
                        {
                            "Source": "Total Loads",
                            "TotalN": 2331581.276546386,
                            "TotalP": 704248.9146853996,
                            "Sediment": 1985908048.666349,
                            "Unit": "kg"
                        },
                        {
                            "Source": "Loading Rates",
                            "TotalN": 45.46791959676804,
                            "TotalP": 13.73348351658453,
                            "Sediment": 38726.98258114515,
                            "Unit": "kg/ha"
                        },
                        {
                            "Source": "Mean Annual Concentration",
                            "TotalN": 0.217547983774843,
                            "TotalP": 0.0657098823903607,
                            "Sediment": 185.29497397128452,
                            "Unit": "mg/l"
                        },
                        {
                            "Source": "Mean Low-Flow Concentration",
                            "TotalN": 0.29156648237934363,
                            "TotalP": 0.07311574742723048,
                            "Sediment": 198.5688810068242,
                            "Unit": "mg/l"
                        }
                    ],
                    "Loads": [
                        {
                            "Source": "Hay/Pasture",
                            "TotalN": 2680.8311748730052,
                            "TotalP": 1011.1203957366364,
                            "Sediment": 525778.0520384308
                        },
                        {
                            "Source": "Cropland",
                            "TotalN": 9873.25696484862,
                            "TotalP": 2799.0725004634037,
                            "Sediment": 2366486.753943352
                        },
                        {
                            "Source": "Wooded Areas",
                            "TotalN": 1006.5166460955287,
                            "TotalP": 74.96563188203417,
                            "Sediment": 26327.765282334134
                        },
                        {
                            "Source": "Wetlands",
                            "TotalN": 511.7680589857378,
                            "TotalP": 27.28078040188129,
                            "Sediment": 413.7764039457631
                        },
                        {
                            "Source": "Open Land",
                            "TotalN": 155.94849000187577,
                            "TotalP": 11.39888005166138,
                            "Sediment": 9092.322783539701
                        },
                        {
                            "Source": "Barren Areas",
                            "TotalN": 65.64124300760453,
                            "TotalP": 2.210179025235355,
                            "Sediment": 25.160556438176936
                        },
                        {
                            "Source": "Low-Density Mixed",
                            "TotalN": 3097.7654150591356,
                            "TotalP": 331.36958518459045,
                            "Sediment": 122541.64527921462
                        },
                        {
                            "Source": "Medium-Density Mixed",
                            "TotalN": 12026.496670594364,
                            "TotalP": 1237.8511259235781,
                            "Sediment": 518413.490228742
                        },
                        {
                            "Source": "High-Density Mixed",
                            "TotalN": 7673.111183047478,
                            "TotalP": 789.7702529196068,
                            "Sediment": 330756.69983287377
                        },
                        {
                            "Source": "Low-Density Open Space",
                            "TotalN": 5622.2084802674735,
                            "TotalP": 601.410579016344,
                            "Sediment": 222403.7604414849
                        },
                        {
                            "Source": "Farm Animals",
                            "TotalN": 35168.6153589223,
                            "TotalP": 8233.004044437892,
                            "Sediment": 0
                        },
                        {
                            "Source": "Stream Bank Erosion",
                            "TotalN": 1144442,
                            "TotalP": 474117,
                            "Sediment": 1982008213
                        },
                        {
                            "Source": "Subsurface Flow",
                            "TotalN": 469466.8564549501,
                            "TotalP": 5868.151309373063,
                            "Sediment": 0
                        },
                        {
                            "Source": "Point Sources",
                            "TotalN": 617635.13,
                            "TotalP": 209745.72,
                            "Sediment": 0
                        },
                        {
                            "Source": "Septic Systems",
                            "TotalN": 27777.338886,
                            "TotalP": 0,
                            "Sediment": 0
                        }
                    ]
                },
                "polling": false,
                "error": null,
                "active": false
            },
            {
                "displayName": "Water Quality",
                "name": "quality",
                "inputmod_hash": "d751713988987e9331980363e24189cea81d1d89a4d53c28e2b08a846af045de",
                "activeVar": null,
                "result": {
                    "MeanFlow": 10717549462.372944,
                    "monthly": [
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 0.5729185779496173,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 7.924799999999999,
                            "AvRunoff": 1.5764158854187598,
                            "AvGroundWater": 4.567045135421832,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 179.95550831565558
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 0.8723196977686928,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 7.248736666666668,
                            "AvRunoff": 1.5432040990842377,
                            "AvGroundWater": 4.755148669036126,
                            "AvPtSrcFlow": 156.99152658886518,
                            "AvStreamFlow": 163.28987935698555
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 2.53036925461453,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.751993333333331,
                            "AvRunoff": 1.4252179033280579,
                            "AvGroundWater": 5.586474616820065,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 180.82373981496312
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 5.043670083970272,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.906509999999999,
                            "AvRunoff": 0.34566348012861875,
                            "AvGroundWater": 5.338279660414788,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 173.8891502000418
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 9.1054511679753,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 9.634643333333335,
                            "AvRunoff": 0.37918415577614806,
                            "AvGroundWater": 3.7631363658883448,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 177.95436781647948
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 11.277727715806732,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 9.25576,
                            "AvRunoff": 0.43632925367370257,
                            "AvGroundWater": 2.009002660260069,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 170.65053897343216
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 10.564844817895892,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 10.811933333333334,
                            "AvRunoff": 0.7350328344530752,
                            "AvGroundWater": 0.9354855879503674,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 175.48256571721842
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 8.829383678649409,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 9.152890000000001,
                            "AvRunoff": 0.4791458131445576,
                            "AvGroundWater": 0.3865234816565334,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 174.67771658961607
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 5.491126335327011,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.694420000000003,
                            "AvRunoff": 0.5529687664550647,
                            "AvGroundWater": 0.440411826103213,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 169.19858765205666
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 4.0166013322744485,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 6.980766666666666,
                            "AvRunoff": 0.5949684700997341,
                            "AvGroundWater": 0.6988805790186436,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 175.10589634393335
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 2.2133938575650953,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.39724,
                            "AvRunoff": 1.0126495252635856,
                            "AvGroundWater": 1.3094287193573628,
                            "AvPtSrcFlow": 168.20520705949838,
                            "AvStreamFlow": 170.52728530411932
                        },
                        {
                            "AvWithdrawal": 0,
                            "AvEvapoTrans": 1.0746429207378023,
                            "AvTileDrain": 0,
                            "AvPrecipitation": 8.713893333333337,
                            "AvRunoff": 1.3489735648205943,
                            "AvGroundWater": 3.301715542625604,
                            "AvPtSrcFlow": 173.812047294815,
                            "AvStreamFlow": 178.46273640226119
                        }
                    ],
                    "watershed_id": null,
                    "meta": {
                        "NRur": 10,
                        "SedDelivRatio": 0.06411293669858417,
                        "NLU": 16,
                        "NUrb": 6,
                        "WxYrBeg": 1961,
                        "NYrs": 30,
                        "WxYrEnd": 1990
                    },
                    "MeanFlowPerSecond": 339.851264027554,
                    "inputmod_hash": "d751713988987e9331980363e24189cea81d1d89a4d53c28e2b08a846af045de",
                    "AreaTotal": 51279.7,
                    "SummaryLoads": [
                        {
                            "Source": "Total Loads",
                            "TotalN": 2331581.276546386,
                            "TotalP": 704248.9146853996,
                            "Sediment": 1985908048.666349,
                            "Unit": "kg"
                        },
                        {
                            "Source": "Loading Rates",
                            "TotalN": 45.46791959676804,
                            "TotalP": 13.73348351658453,
                            "Sediment": 38726.98258114515,
                            "Unit": "kg/ha"
                        },
                        {
                            "Source": "Mean Annual Concentration",
                            "TotalN": 0.217547983774843,
                            "TotalP": 0.0657098823903607,
                            "Sediment": 185.29497397128452,
                            "Unit": "mg/l"
                        },
                        {
                            "Source": "Mean Low-Flow Concentration",
                            "TotalN": 0.29156648237934363,
                            "TotalP": 0.07311574742723048,
                            "Sediment": 198.5688810068242,
                            "Unit": "mg/l"
                        }
                    ],
                    "Loads": [
                        {
                            "Source": "Hay/Pasture",
                            "TotalN": 2680.8311748730052,
                            "TotalP": 1011.1203957366364,
                            "Sediment": 525778.0520384308
                        },
                        {
                            "Source": "Cropland",
                            "TotalN": 9873.25696484862,
                            "TotalP": 2799.0725004634037,
                            "Sediment": 2366486.753943352
                        },
                        {
                            "Source": "Wooded Areas",
                            "TotalN": 1006.5166460955287,
                            "TotalP": 74.96563188203417,
                            "Sediment": 26327.765282334134
                        },
                        {
                            "Source": "Wetlands",
                            "TotalN": 511.7680589857378,
                            "TotalP": 27.28078040188129,
                            "Sediment": 413.7764039457631
                        },
                        {
                            "Source": "Open Land",
                            "TotalN": 155.94849000187577,
                            "TotalP": 11.39888005166138,
                            "Sediment": 9092.322783539701
                        },
                        {
                            "Source": "Barren Areas",
                            "TotalN": 65.64124300760453,
                            "TotalP": 2.210179025235355,
                            "Sediment": 25.160556438176936
                        },
                        {
                            "Source": "Low-Density Mixed",
                            "TotalN": 3097.7654150591356,
                            "TotalP": 331.36958518459045,
                            "Sediment": 122541.64527921462
                        },
                        {
                            "Source": "Medium-Density Mixed",
                            "TotalN": 12026.496670594364,
                            "TotalP": 1237.8511259235781,
                            "Sediment": 518413.490228742
                        },
                        {
                            "Source": "High-Density Mixed",
                            "TotalN": 7673.111183047478,
                            "TotalP": 789.7702529196068,
                            "Sediment": 330756.69983287377
                        },
                        {
                            "Source": "Low-Density Open Space",
                            "TotalN": 5622.2084802674735,
                            "TotalP": 601.410579016344,
                            "Sediment": 222403.7604414849
                        },
                        {
                            "Source": "Farm Animals",
                            "TotalN": 35168.6153589223,
                            "TotalP": 8233.004044437892,
                            "Sediment": 0
                        },
                        {
                            "Source": "Stream Bank Erosion",
                            "TotalN": 1144442,
                            "TotalP": 474117,
                            "Sediment": 1982008213
                        },
                        {
                            "Source": "Subsurface Flow",
                            "TotalN": 469466.8564549501,
                            "TotalP": 5868.151309373063,
                            "Sediment": 0
                        },
                        {
                            "Source": "Point Sources",
                            "TotalN": 617635.13,
                            "TotalP": 209745.72,
                            "Sediment": 0
                        },
                        {
                            "Source": "Septic Systems",
                            "TotalN": 27777.338886,
                            "TotalP": 0,
                            "Sediment": 0
                        }
                    ]
                },
                "polling": false,
                "error": null,
                "active": false
            },
            {
                "displayName": "",
                "name": "subbasin",
                "inputmod_hash": "d751713988987e9331980363e24189ced751713988987e9331980363e24189ce",
                "activeVar": null,
                "result": {
                    "Loads": [
                        {
                            "Source": "High-Density Mixed",
                            "TotalN": 7794.998821987623,
                            "TotalP": 736.005135641481,
                            "Sediment": 304433.3414534615,
                            "Area": 5058.031758723835
                        },
                        {
                            "Source": "Barren Areas",
                            "TotalN": 63.51019838180732,
                            "TotalP": 1.8007594911769187,
                            "Sediment": 49.11596939557813,
                            "Area": 119.07937344356762
                        },
                        {
                            "Source": "Low-Density Mixed",
                            "TotalN": 3192.2437511396183,
                            "TotalP": 286.53054329773806,
                            "Sediment": 110055.40819740709,
                            "Area": 9506.769567604591
                        },
                        {
                            "Source": "Open Land",
                            "TotalN": 234.73821904413518,
                            "TotalP": 22.36267280570272,
                            "Sediment": 17239.003764550445,
                            "Area": 225.567154624855
                        },
                        {
                            "Source": "Farm Animals",
                            "TotalN": 35312.41164830475,
                            "TotalP": 6643.555546936111,
                            "Sediment": 0,
                            "Area": 8745.7829981922
                        },
                        {
                            "Source": "Point Sources",
                            "TotalN": 608528.4,
                            "TotalP": 141427.0008585126,
                            "Sediment": 0,
                            "Area": 51280
                        },
                        {
                            "Source": "Hay/Pasture",
                            "TotalN": 8177.992297012084,
                            "TotalP": 2641.5540865520575,
                            "Sediment": 1813655.3996741597,
                            "Area": 5377.269307380701
                        },
                        {
                            "Source": "Subsurface Flow",
                            "TotalN": 632267.886276921,
                            "TotalP": 5912.534628765841,
                            "Sediment": 0,
                            "Area": 51280
                        },
                        {
                            "Source": "Low-Density Open Space",
                            "TotalN": 5676.026511493332,
                            "TotalP": 509.1119688586746,
                            "Sediment": 197501.0623026959,
                            "Area": 17254.145223054245
                        },
                        {
                            "Source": "Wetlands",
                            "TotalN": 510.5795976596422,
                            "TotalP": 23.770265258253527,
                            "Sediment": 1742.4545107723247,
                            "Area": 1464.7912183938922
                        },
                        {
                            "Source": "Stream Bank Erosion",
                            "TotalN": 168029.7999123521,
                            "TotalP": 60294.83810598137,
                            "Sediment": 276860302.8801711,
                            "Area": 51280
                        },
                        {
                            "Source": "Cropland",
                            "TotalN": 25309.782883114793,
                            "TotalP": 6190.604244155454,
                            "Sediment": 5170756.86295971,
                            "Area": 3368.5136908115005
                        },
                        {
                            "Source": "Wooded Areas",
                            "TotalN": 1416.488425092467,
                            "TotalP": 101.50794121122046,
                            "Sediment": 46132.8539593064,
                            "Area": 18232.082364135123
                        },
                        {
                            "Source": "Medium-Density Mixed",
                            "TotalN": 12010.61456356649,
                            "TotalP": 1089.4361575804328,
                            "Sediment": 476114.58392921067,
                            "Area": 7927.7189244081255
                        },
                        {
                            "Source": "Septic Systems",
                            "TotalN": 27775.74624,
                            "TotalP": 0,
                            "Sediment": 0,
                            "Area": 9506.769567604591
                        }
                    ],
                    "SummaryLoads": {
                        "Source": "Entire area",
                        "TotalN": 1536301.2193460697,
                        "TotalP": 225880.6129150481,
                        "Sediment": 284997982.9668918,
                        "Area": 51280
                    },
                    "HUC12s": {
                        "020402031001": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 11.0279194608066,
                                    "TotalP": 0.97797894924699,
                                    "Sediment": 484.079118052005,
                                    "Area": 7.290650779947651
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 0,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 0
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 28.1132505860896,
                                    "TotalP": 2.69216897753615,
                                    "Sediment": 1165.912896518,
                                    "Area": 101.25903861038404
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 34.1568406699949,
                                    "TotalP": 6.07712608787639,
                                    "Sediment": 4815.89780120482,
                                    "Area": 31.50281201211948
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 4441.13105234415,
                                    "TotalP": 892.284172863564,
                                    "Sediment": 0,
                                    "Area": 1092.0674804087018
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 0,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 3115.5
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 1109.78456266299,
                                    "TotalP": 443.693519592835,
                                    "Sediment": 315239.544431087,
                                    "Area": 729.6051262006871
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 35249.0915080352,
                                    "TotalP": 337.179611178279,
                                    "Sediment": 0,
                                    "Area": 3115.5
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 176.894234191249,
                                    "TotalP": 16.8902178256341,
                                    "Sediment": 7319.80384519901,
                                    "Area": 637.4368990566576
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 31.8614055109824,
                                    "TotalP": 1.76193257971834,
                                    "Sediment": 293.132628788678,
                                    "Area": 83.16742371199543
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 528.197645067316,
                                    "TotalP": 252.09433060031,
                                    "Sediment": 877903.398896836,
                                    "Area": 3115.5
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 3503.95827252377,
                                    "TotalP": 1238.96516180656,
                                    "Sediment": 990435.04831547,
                                    "Area": 362.4623542080147
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 128.594738500321,
                                    "TotalP": 13.7145545502701,
                                    "Sediment": 7689.20690481718,
                                    "Area": 1775.7685091060148
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 36.7093757393973,
                                    "TotalP": 3.27297151813326,
                                    "Sediment": 1618.00591223568,
                                    "Area": 24.30216926649217
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 84.410238,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 101.25903861038404
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 45363.931043292265,
                                "TotalP": 3209.6037465299632,
                                "Sediment": 2206964.0307502085,
                                "Area": 3115.5
                            },
                            "Catchments": {
                                "4781385": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.15611593621704,
                                        "TotalP": 0.0477413724347687,
                                        "Sediment": 109.376595891726
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 130.892738730566,
                                        "TotalP": 4.36943594970749,
                                        "Sediment": 8879.57996943451
                                    }
                                },
                                "4781407": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.60402075719349,
                                        "TotalP": 0.0998606903662835,
                                        "Sediment": 110.854629698771
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 730.11959684492,
                                        "TotalP": 55.602324581403,
                                        "Sediment": 45004.9689224036
                                    }
                                },
                                "4781409": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.857574413737946,
                                        "TotalP": 0.0481649051787212,
                                        "Sediment": 41.3464105694696
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2202.96213896989,
                                        "TotalP": 111.810421265227,
                                        "Sediment": 90207.7550822382
                                    }
                                },
                                "4781421": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.991212581269139,
                                        "TotalP": 0.0578443696711431,
                                        "Sediment": 54.0476943249875
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 70.3287475676846,
                                        "TotalP": 6.54353523200594,
                                        "Sediment": 4425.99281335926
                                    }
                                },
                                "4781423": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.03072814128766,
                                        "TotalP": 0.232382552011311,
                                        "Sediment": 141.906153109577
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 9302.97520532969,
                                        "TotalP": 713.310141566825,
                                        "Sediment": 435588.202675685
                                    }
                                },
                                "4781431": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.22071208455877,
                                        "TotalP": 0.176823673613587,
                                        "Sediment": 116.855378379034
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4363.50533055691,
                                        "TotalP": 353.368629711555,
                                        "Sediment": 230355.155706125
                                    }
                                },
                                "4781441": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.90808033502186,
                                        "TotalP": 0.154447502724562,
                                        "Sediment": 104.877872456365
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 762.295531818804,
                                        "TotalP": 52.8104228355806,
                                        "Sediment": 30803.6117551466
                                    }
                                },
                                "4781445": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.835081289472705,
                                        "TotalP": 0.0987499551637078,
                                        "Sediment": 74.4677350679435
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 840.263084856386,
                                        "TotalP": 99.3627123506508,
                                        "Sediment": 74929.817706691
                                    }
                                },
                                "4781447": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.70958896869145,
                                        "TotalP": 0.136637466940348,
                                        "Sediment": 97.4401279121889
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 633.23165532837,
                                        "TotalP": 50.2928121987535,
                                        "Sediment": 28288.6880561653
                                    }
                                },
                                "4781449": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.12287776758084,
                                        "TotalP": 0.257518627174047,
                                        "Sediment": 192.357218759464
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3901.30853435647,
                                        "TotalP": 321.709555327277,
                                        "Sediment": 240305.549894355
                                    }
                                },
                                "4781451": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.32333028576014,
                                        "TotalP": 0.183665159191148,
                                        "Sediment": 122.918514194204
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2826.83052900821,
                                        "TotalP": 240.033494283111,
                                        "Sediment": 181964.255148558
                                    }
                                },
                                "4781493": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.82354863054386,
                                        "TotalP": 0.273847159583643,
                                        "Sediment": 186.241437045879
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3673.01940666358,
                                        "TotalP": 263.066075209654,
                                        "Sediment": 178909.300938361
                                    }
                                },
                                "4781501": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.55859764118917,
                                        "TotalP": 0.331563266632604,
                                        "Sediment": 186.495570985951
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4836.77896501505,
                                        "TotalP": 450.654554214886,
                                        "Sediment": 253481.271490948
                                    }
                                },
                                "4782123": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.52904895417035,
                                        "TotalP": 0.121609816219271,
                                        "Sediment": 86.3302341751214
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 10277.4135899094,
                                        "TotalP": 870.114275848367,
                                        "Sediment": 560589.026718431
                                    }
                                },
                                "4782463": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.15831429826508,
                                        "TotalP": 0.0475523264851434,
                                        "Sediment": 108.854606667595
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.52423676167071,
                                        "TotalP": 0.0273309357987537,
                                        "Sediment": 28.5365865044768
                                    }
                                },
                                "4782465": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.24284268025602,
                                        "TotalP": 0.0514591985194396,
                                        "Sediment": 101.084812504749
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 216.573675140621,
                                        "TotalP": 9.51838387249496,
                                        "Sediment": 15153.6368776588
                                    }
                                },
                                "4782687": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.38624068827293,
                                        "TotalP": 0.0689863683906404,
                                        "Sediment": 170.308084504837
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 126.35340624875,
                                        "TotalP": 6.2879864258986,
                                        "Sediment": 15523.2830567799
                                    }
                                },
                                "4782693": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.444971548820193,
                                        "TotalP": 0.0348261895290082,
                                        "Sediment": 34.6071492756659
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 544.357025117968,
                                        "TotalP": 42.6047035557009,
                                        "Sediment": 42336.7401297096
                                    }
                                }
                            }
                        },
                        "020402031002": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 417.387871542399,
                                    "TotalP": 37.4584163011132,
                                    "Sediment": 17604.9669905325,
                                    "Area": 273.8298936510773
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 3.55020480599836,
                                    "TotalP": 0.10619426802822,
                                    "Sediment": 4.87853856911586,
                                    "Area": 6.031098906844898
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 434.106108209982,
                                    "TotalP": 40.0848964730582,
                                    "Sediment": 15423.8584323791,
                                    "Area": 1219.362176001806
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 80.7647788622575,
                                    "TotalP": 8.96330609976487,
                                    "Sediment": 6372.06547526047,
                                    "Area": 62.74143191150588
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 3359.32751807924,
                                    "TotalP": 702.738176493114,
                                    "Sediment": 0,
                                    "Area": 1278.3229190463344
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 169469.88,
                                    "TotalP": 19298.8337294952,
                                    "Sediment": 0,
                                    "Area": 6347.599999999999
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 1849.69537751028,
                                    "TotalP": 733.041737786857,
                                    "Sediment": 415254.774601408,
                                    "Area": 831.0314195222701
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 39831.7366845182,
                                    "TotalP": 510.777681075893,
                                    "Sediment": 0,
                                    "Area": 6347.599999999999
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 697.581531111579,
                                    "TotalP": 63.685591226587,
                                    "Sediment": 24572.7313329285,
                                    "Area": 1959.4770299134289
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 60.017972797955,
                                    "TotalP": 3.05756263119069,
                                    "Sediment": 162.35791772422,
                                    "Area": 213.69893738581777
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 4898.29339608462,
                                    "TotalP": 2347.39054813464,
                                    "Sediment": 7834485.02819764,
                                    "Area": 6347.599999999999
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 4185.92831750111,
                                    "TotalP": 1269.46658458246,
                                    "Sediment": 879878.20792073,
                                    "Area": 447.2914995240642
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 349.990137412134,
                                    "TotalP": 22.451034962362,
                                    "Sediment": 6755.32718361208,
                                    "Area": 2620.107401216932
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 1026.85343415252,
                                    "TotalP": 91.7066774379819,
                                    "Sediment": 43142.89444209,
                                    "Area": 673.5927331331399
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 2360.301372,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 1219.362176001806
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 229025.41470458827,
                                "TotalP": 25129.76213696825,
                                "Sediment": 9243657.091032874,
                                "Area": 6347.599999999999
                            },
                            "Catchments": {
                                "4781263": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.792191992479909,
                                        "TotalP": 0.0966360519157775,
                                        "Sediment": 158.93895518648
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1607.6656144075,
                                        "TotalP": 196.112128438402,
                                        "Sediment": 322548.947059244
                                    }
                                },
                                "4781265": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.810533935228211,
                                        "TotalP": 0.10138616958966,
                                        "Sediment": 176.343683987945
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4019.87293989841,
                                        "TotalP": 502.828446656803,
                                        "Sediment": 874583.003345253
                                    }
                                },
                                "4781291": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.03297224879525,
                                        "TotalP": 0.121963350638101,
                                        "Sediment": 184.249350858526
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 934.250654969322,
                                        "TotalP": 95.4307943836965,
                                        "Sediment": 231738.094572835
                                    }
                                },
                                "4781293": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.03321871251748,
                                        "TotalP": 0.117607318068497,
                                        "Sediment": 183.010507911027
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 736.461966591645,
                                        "TotalP": 73.4720405710977,
                                        "Sediment": 148575.146923764
                                    }
                                },
                                "4781363": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.55960988616422,
                                        "TotalP": 0.207295628830444,
                                        "Sediment": 330.927077118791
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2617.33738136633,
                                        "TotalP": 347.883533661207,
                                        "Sediment": 555361.835759809
                                    }
                                },
                                "4781375": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.43085867283712,
                                        "TotalP": 0.162736686862313,
                                        "Sediment": 253.909766604403
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2520.17967684026,
                                        "TotalP": 286.629070146752,
                                        "Sediment": 447212.744134175
                                    }
                                },
                                "4781503": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.00314983082753,
                                        "TotalP": 0.355145060679389,
                                        "Sediment": 260.877781779873
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4776.88892617977,
                                        "TotalP": 564.903052832146,
                                        "Sediment": 414959.045359128
                                    }
                                },
                                "4782079": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.868147682769079,
                                        "TotalP": 0.101331114010955,
                                        "Sediment": 193.642541500303
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2390.98208763126,
                                        "TotalP": 237.499486048991,
                                        "Sediment": 592094.740367751
                                    }
                                },
                                "4782081": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.796664857360506,
                                        "TotalP": 0.095444042995193,
                                        "Sediment": 132.392637846371
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3188.63539677685,
                                        "TotalP": 382.012901779406,
                                        "Sediment": 529898.924760232
                                    }
                                },
                                "4782083": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.24890795559354,
                                        "TotalP": 0.150089741047598,
                                        "Sediment": 215.807404553154
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4631.553332239,
                                        "TotalP": 556.605182287849,
                                        "Sediment": 800317.989170777
                                    }
                                },
                                "4782357": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.03153413310686,
                                        "TotalP": 0.121166183238868,
                                        "Sediment": 183.561397880598
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 91.0523910156736,
                                        "TotalP": 5.37084503676873,
                                        "Sediment": 12541.2215719698
                                    }
                                },
                                "4782377": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.03313642459231,
                                        "TotalP": 0.117385924628735,
                                        "Sediment": 182.742358351221
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.08331366066393,
                                        "TotalP": 0.044725947963791,
                                        "Sediment": 99.9005745083553
                                    }
                                },
                                "4782379": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 474.779691593793,
                                        "TotalP": 32.4747898469099,
                                        "Sediment": 43731.3266552061
                                    }
                                },
                                "4782381": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.868091223136617,
                                        "TotalP": 0.101230487593739,
                                        "Sediment": 193.491641742293
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.254253974962879,
                                        "TotalP": 0.0133749655336894,
                                        "Sediment": 32.0679452301212
                                    }
                                },
                                "4782437": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1420.44768544096,
                                        "TotalP": 194.472495755096,
                                        "Sediment": 226269.938945764
                                    }
                                },
                                "4782441": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 153067.506004372,
                                        "TotalP": 19070.6713885458,
                                        "Sediment": 2548416.63237689
                                    }
                                },
                                "4782445": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.43102636727064,
                                        "TotalP": 0.162663149290959,
                                        "Sediment": 253.830992663704
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.295361178088954,
                                        "TotalP": 0.0159982362848405,
                                        "Sediment": 35.9073481652655
                                    }
                                },
                                "4782447": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2786.25165061419,
                                        "TotalP": 279.205316513209,
                                        "Sediment": 238641.561883191
                                    }
                                },
                                "4782455": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3091.65348754956,
                                        "TotalP": 389.182151172148,
                                        "Sediment": 390138.608116555
                                    }
                                },
                                "4782457": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.32310966856786,
                                        "TotalP": 0.182582868037687,
                                        "Sediment": 122.363827583733
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.91293404827725,
                                        "TotalP": 0.0765034421952715,
                                        "Sediment": 164.095790583702
                                    }
                                },
                                "4782459": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 85.9056357222025,
                                        "TotalP": 4.76662101922997,
                                        "Sediment": 10527.4536528393
                                    }
                                },
                                "4782461": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.00022397693007,
                                        "TotalP": 0.354344719748743,
                                        "Sediment": 260.40491157557
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.708121795978405,
                                        "TotalP": 0.0377850685628406,
                                        "Sediment": 96.0840287287248
                                    }
                                },
                                "4782471": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 41367.6928006372,
                                        "TotalP": 4909.27620518898,
                                        "Sediment": 1919956.29689173
                                    }
                                }
                            }
                        },
                        "020402031003": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 76.6646222142783,
                                    "TotalP": 6.10738560161122,
                                    "Sediment": 3220.25149254978,
                                    "Area": 54.376907395235094
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 0.514639025814472,
                                    "TotalP": 0.0150424831147299,
                                    "Sediment": 2.52789643397446,
                                    "Area": 3.060951740791379
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 166.019233516293,
                                    "TotalP": 14.0032306925887,
                                    "Sediment": 5762.14733687632,
                                    "Area": 568.9769118176916
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 15.8078982765851,
                                    "TotalP": 2.13379866022092,
                                    "Sediment": 1880.21359146132,
                                    "Area": 35.200945019100864
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 11573.42798825,
                                    "TotalP": 2021.41685809874,
                                    "Sediment": 0,
                                    "Area": 2710.2026824936383
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 0,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 8264.3
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 1274.76132638727,
                                    "TotalP": 391.687796891165,
                                    "Sediment": 270946.04717497,
                                    "Area": 1586.1131696841921
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 124665.120611864,
                                    "TotalP": 939.298991476157,
                                    "Sediment": 0,
                                    "Area": 8264.3
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 510.895743210949,
                                    "TotalP": 42.7598188265726,
                                    "Sediment": 17628.7898716849,
                                    "Area": 1751.0444517174215
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 171.491428499558,
                                    "TotalP": 7.55375453577478,
                                    "Sediment": 721.289131805351,
                                    "Area": 485.2508789078098
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 2962.58270177511,
                                    "TotalP": 1230.61127612197,
                                    "Sediment": 4950104.02942126,
                                    "Area": 8264.3
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 5984.01180774311,
                                    "TotalP": 1411.81308273361,
                                    "Sediment": 1205257.93171054,
                                    "Area": 1124.089512809446
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 190.853229275725,
                                    "TotalP": 15.0105114303655,
                                    "Sediment": 8332.29706453964,
                                    "Area": 4168.656158988354
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 335.971432644926,
                                    "TotalP": 26.5235396060844,
                                    "Sediment": 14014.3648620826,
                                    "Area": 238.39412381222272
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 834.546504,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 568.9769118176916
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 148762.6691666836,
                                "TotalP": 6108.935087157974,
                                "Sediment": 6477869.889554204,
                                "Area": 8264.3
                            },
                            "Catchments": {
                                "4781739": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.71659454903205,
                                        "TotalP": 0.127164287797287,
                                        "Sediment": 130.457657251501
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 624.100927681252,
                                        "TotalP": 78.7085982397574,
                                        "Sediment": 241502.082957087
                                    }
                                },
                                "4781749": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.07074486021408,
                                        "TotalP": 0.320512767570125,
                                        "Sediment": 173.456596178187
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5763.77489362257,
                                        "TotalP": 364.317963875661,
                                        "Sediment": 197163.296861844
                                    }
                                },
                                "4781753": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.89949747984145,
                                        "TotalP": 0.289339036692951,
                                        "Sediment": 169.269537636026
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 132.42194125609,
                                        "TotalP": 6.04936595662938,
                                        "Sediment": 2935.72455929369
                                    }
                                },
                                "4781755": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.07896131397313,
                                        "TotalP": 0.29567147273066,
                                        "Sediment": 178.008035307619
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6245.12994376565,
                                        "TotalP": 363.559919778768,
                                        "Sediment": 218880.051019894
                                    }
                                },
                                "4781757": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.46848684654584,
                                        "TotalP": 0.26512271882963,
                                        "Sediment": 151.264585391992
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 97.6287689716814,
                                        "TotalP": 3.88999249000396,
                                        "Sediment": 2172.3750596348
                                    }
                                },
                                "4781765": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.47915464452946,
                                        "TotalP": 0.264741087511054,
                                        "Sediment": 150.798728172702
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 898.408404413816,
                                        "TotalP": 57.9424014157111,
                                        "Sediment": 31020.6015396925
                                    }
                                },
                                "4781769": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.66414636636723,
                                        "TotalP": 0.289038378511573,
                                        "Sediment": 161.227782483943
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3613.59443403972,
                                        "TotalP": 223.935398628323,
                                        "Sediment": 124912.85041947
                                    }
                                },
                                "4781771": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.40821136577913,
                                        "TotalP": 0.255432264429778,
                                        "Sediment": 146.705777016366
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1802.78123931296,
                                        "TotalP": 92.1553727476515,
                                        "Sediment": 56645.197974208
                                    }
                                },
                                "4781775": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.04126113696105,
                                        "TotalP": 0.11160227856484,
                                        "Sediment": 108.990191267016
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 123.543946648763,
                                        "TotalP": 2.43195407475195,
                                        "Sediment": 4429.39161138911
                                    }
                                },
                                "4781781": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.38699875200693,
                                        "TotalP": 0.245307937984261,
                                        "Sediment": 141.646004890183
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 598.2683907198,
                                        "TotalP": 23.3246458326354,
                                        "Sediment": 14556.7886996118
                                    }
                                },
                                "4781783": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.58869696996013,
                                        "TotalP": 0.0976722116620459,
                                        "Sediment": 153.322412507328
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 351.144786198594,
                                        "TotalP": 17.7211386600433,
                                        "Sediment": 15633.1365289847
                                    }
                                },
                                "4781785": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.66163216445244,
                                        "TotalP": 0.20325749668382,
                                        "Sediment": 126.386793514893
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3724.32790890568,
                                        "TotalP": 199.712352243059,
                                        "Sediment": 125332.932885473
                                    }
                                },
                                "4781787": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.12453368433867,
                                        "TotalP": 0.159124265661496,
                                        "Sediment": 148.884443713478
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 974.762570332778,
                                        "TotalP": 40.1408131020471,
                                        "Sediment": 50208.3806068915
                                    }
                                },
                                "4781789": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.05370103595273,
                                        "TotalP": 0.145383139427435,
                                        "Sediment": 139.239696147562
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4000.80952409741,
                                        "TotalP": 187.247890465854,
                                        "Sediment": 145110.600157402
                                    }
                                },
                                "4781791": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.4600615507123,
                                        "TotalP": 0.184269335616221,
                                        "Sediment": 168.186480930482
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5748.88861883363,
                                        "TotalP": 338.008314159467,
                                        "Sediment": 209675.820612805
                                    }
                                },
                                "4781793": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.38879310433906,
                                        "TotalP": 0.272842259220572,
                                        "Sediment": 140.402569246068
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1026.57236350372,
                                        "TotalP": 62.8384171552237,
                                        "Sediment": 35141.8417067551
                                    }
                                },
                                "4781795": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.865758620757,
                                        "TotalP": 0.139957653630632,
                                        "Sediment": 131.334200299381
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7751.55073053859,
                                        "TotalP": 427.553844184547,
                                        "Sediment": 547039.331332228
                                    }
                                },
                                "4781797": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.98668893474933,
                                        "TotalP": 0.143134713341733,
                                        "Sediment": 129.310362549378
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 278.300461877784,
                                        "TotalP": 8.14004347628292,
                                        "Sediment": 19441.5037617409
                                    }
                                },
                                "4781799": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1023.7160143632,
                                        "TotalP": 71.2042266145753,
                                        "Sediment": 39953.169709182
                                    }
                                },
                                "4781801": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.00208077967574,
                                        "TotalP": 0.14381980274361,
                                        "Sediment": 130.157195743007
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 101.681326585763,
                                        "TotalP": 7.43994325631941,
                                        "Sediment": 6334.57193851021
                                    }
                                },
                                "4781803": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.00301727348252,
                                        "TotalP": 0.144935492761693,
                                        "Sediment": 130.938469434022
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7812.40799574398,
                                        "TotalP": 443.608439218324,
                                        "Sediment": 271242.298807343
                                    }
                                },
                                "4781805": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.98342280936962,
                                        "TotalP": 0.186790532310598,
                                        "Sediment": 249.964250474148
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6649.38406407495,
                                        "TotalP": 311.802700417515,
                                        "Sediment": 417256.310272088
                                    }
                                },
                                "4781807": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.07354739751663,
                                        "TotalP": 0.154829638926145,
                                        "Sediment": 135.336046211444
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1186.489986402,
                                        "TotalP": 37.4438775487347,
                                        "Sediment": 42782.4488835158
                                    }
                                },
                                "4781811": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.84063229009236,
                                        "TotalP": 0.133515967576199,
                                        "Sediment": 143.085068755021
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3630.95815791501,
                                        "TotalP": 140.667461143315,
                                        "Sediment": 113942.762701755
                                    }
                                },
                                "4781813": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.11422330425145,
                                        "TotalP": 0.147829175711854,
                                        "Sediment": 141.305619464086
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 355.210710551146,
                                        "TotalP": 13.1535501494251,
                                        "Sediment": 13551.1130872756
                                    }
                                },
                                "4781817": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.90092314935381,
                                        "TotalP": 0.117033885887583,
                                        "Sediment": 112.271806591689
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1770.53724867839,
                                        "TotalP": 71.4299702726347,
                                        "Sediment": 68523.5027998859
                                    }
                                },
                                "4781825": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.11414998641222,
                                        "TotalP": 0.129355556539891,
                                        "Sediment": 134.729351117939
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1073.21097959536,
                                        "TotalP": 48.4787165179994,
                                        "Sediment": 60913.1284608077
                                    }
                                },
                                "4781835": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.46782456751666,
                                        "TotalP": 0.09542180376278,
                                        "Sediment": 111.123051302034
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1152.9518432145,
                                        "TotalP": 74.9522435894921,
                                        "Sediment": 87285.3130119346
                                    }
                                },
                                "4781839": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.27539636770983,
                                        "TotalP": 0.116649873851042,
                                        "Sediment": 165.889448459642
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1636.71983749467,
                                        "TotalP": 101.868425203255,
                                        "Sediment": 61631.3075667601
                                    }
                                },
                                "4781841": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.1543485068969,
                                        "TotalP": 0.12807785570239,
                                        "Sediment": 97.9939961209053
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 77.0059161134872,
                                        "TotalP": 4.57806737426142,
                                        "Sediment": 3502.73756579021
                                    }
                                },
                                "4781845": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.94027462048354,
                                        "TotalP": 0.217906442841299,
                                        "Sediment": 149.981462681266
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3959.96781758794,
                                        "TotalP": 213.691668955823,
                                        "Sediment": 148727.113967826
                                    }
                                },
                                "4781847": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.13209263372367,
                                        "TotalP": 0.145268330650667,
                                        "Sediment": 145.989590076975
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5600.1131641213,
                                        "TotalP": 231.837774648538,
                                        "Sediment": 216905.56177948
                                    }
                                },
                                "4781849": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.72827845416623,
                                        "TotalP": 0.144872967876082,
                                        "Sediment": 101.030797311172
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5191.42909281449,
                                        "TotalP": 238.678829617682,
                                        "Sediment": 152542.400494368
                                    }
                                },
                                "4781851": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.6551523181828,
                                        "TotalP": 0.110336839891584,
                                        "Sediment": 107.148060588245
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2512.92476302608,
                                        "TotalP": 167.518224269547,
                                        "Sediment": 162676.879828218
                                    }
                                },
                                "4781853": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.70533585681067,
                                        "TotalP": 0.237641365095437,
                                        "Sediment": 180.474114385551
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5684.80353225077,
                                        "TotalP": 287.109042332872,
                                        "Sediment": 218041.796411578
                                    }
                                },
                                "4781855": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.55405770252884,
                                        "TotalP": 0.17838564149967,
                                        "Sediment": 257.369411054336
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2709.12824560508,
                                        "TotalP": 189.216390655011,
                                        "Sediment": 272995.688527977
                                    }
                                },
                                "4781857": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.08521704140492,
                                        "TotalP": 0.168657696484897,
                                        "Sediment": 338.733077289368
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7969.24192602477,
                                        "TotalP": 329.009198863023,
                                        "Sediment": 660783.947072116
                                    }
                                },
                                "4781859": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.61885842989824,
                                        "TotalP": 0.167775498559895,
                                        "Sediment": 181.331823819391
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 11388.881026274,
                                        "TotalP": 549.953311513802,
                                        "Sediment": 381054.399177218
                                    }
                                },
                                "4781861": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.64030271604424,
                                        "TotalP": 0.158505271905668,
                                        "Sediment": 111.926200345015
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4303.54845279887,
                                        "TotalP": 258.354889962047,
                                        "Sediment": 182433.560892635
                                    }
                                },
                                "4781865": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.26657344529991,
                                        "TotalP": 0.114302207810193,
                                        "Sediment": 174.505115634708
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2087.50130101423,
                                        "TotalP": 107.983075309915,
                                        "Sediment": 68356.69544975
                                    }
                                },
                                "4781879": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.51791374170179,
                                        "TotalP": 0.165787192368941,
                                        "Sediment": 119.830948595587
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3154.54699834734,
                                        "TotalP": 207.705085917044,
                                        "Sediment": 150129.193443232
                                    }
                                },
                                "4781885": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.84095828305055,
                                        "TotalP": 0.149891452791161,
                                        "Sediment": 109.592519560671
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4716.92213016561,
                                        "TotalP": 248.868952075607,
                                        "Sediment": 181959.511303087
                                    }
                                },
                                "4781893": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.0606783613942,
                                        "TotalP": 0.115618210766525,
                                        "Sediment": 130.432931879468
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3163.59959097075,
                                        "TotalP": 177.499667654237,
                                        "Sediment": 200243.559438272
                                    }
                                },
                                "4781899": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.3606291705411,
                                        "TotalP": 0.115796806812741,
                                        "Sediment": 213.000355917061
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2564.6684624579,
                                        "TotalP": 120.8892628075,
                                        "Sediment": 106011.194654923
                                    }
                                },
                                "4781921": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.83215978407488,
                                        "TotalP": 0.166847501264787,
                                        "Sediment": 402.395975330596
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4522.62359993016,
                                        "TotalP": 266.435690193938,
                                        "Sediment": 642578.693751748
                                    }
                                },
                                "4781925": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.32576707115846,
                                        "TotalP": 0.0909593780909797,
                                        "Sediment": 144.666324132154
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3418.31433770382,
                                        "TotalP": 137.836911617178,
                                        "Sediment": 212707.660718872
                                    }
                                },
                                "4782169": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.49919290205241,
                                        "TotalP": 0.0920645596321683,
                                        "Sediment": 203.555913166658
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1081.13317140219,
                                        "TotalP": 66.3917559859098,
                                        "Sediment": 146793.01753514
                                    }
                                },
                                "4782569": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.73123114795877,
                                        "TotalP": 0.128836257384638,
                                        "Sediment": 128.738859602703
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3248.18499596572,
                                        "TotalP": 194.56923898323,
                                        "Sediment": 411342.056052622
                                    }
                                },
                                "4782573": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.5883281207267,
                                        "TotalP": 0.0970712432555927,
                                        "Sediment": 152.569811310004
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6.49651625152549,
                                        "TotalP": 0.144518375924125,
                                        "Sediment": 288.662310780706
                                    }
                                },
                                "4782575": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.81637593401245,
                                        "TotalP": 0.133619427960915,
                                        "Sediment": 126.904112868807
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 186.273276072202,
                                        "TotalP": 10.7874500761331,
                                        "Sediment": 29339.9634322863
                                    }
                                },
                                "4782581": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.04147693551064,
                                        "TotalP": 0.109092202470797,
                                        "Sediment": 107.110056420038
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.46590094556126,
                                        "TotalP": 0.0101368671885481,
                                        "Sediment": 19.4921232483435
                                    }
                                },
                                "4782583": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.86512354219848,
                                        "TotalP": 0.139488419190436,
                                        "Sediment": 131.006190209592
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 48.6737891543879,
                                        "TotalP": 3.41079129244225,
                                        "Sediment": 3819.0644704523
                                    }
                                },
                                "4782611": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.40861119670011,
                                        "TotalP": 0.253876890477106,
                                        "Sediment": 145.660568699462
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 151.386895518727,
                                        "TotalP": 6.45090184295549,
                                        "Sediment": 2480.53548328256
                                    }
                                },
                                "4782621": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.41022971138945,
                                        "TotalP": 0.176485994883501,
                                        "Sediment": 161.944051556111
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 225.108827647628,
                                        "TotalP": 9.51450568578042,
                                        "Sediment": 7764.61890376688
                                    }
                                },
                                "4782623": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.44907339747777,
                                        "TotalP": 0.180330929756945,
                                        "Sediment": 165.436984695814
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 76.5078538026052,
                                        "TotalP": 1.42560189914344,
                                        "Sediment": 2416.24633985231
                                    }
                                },
                                "4782729": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.30486958734771,
                                        "TotalP": 0.303792777993152,
                                        "Sediment": 178.273876415539
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 477.012571694306,
                                        "TotalP": 33.6625701086461,
                                        "Sediment": 19754.1129944619
                                    }
                                },
                                "4782733": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.73568531935595,
                                        "TotalP": 0.309609118101878,
                                        "Sediment": 119.296208118861
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 334.316697561973,
                                        "TotalP": 21.8569205761695,
                                        "Sediment": 8421.74081266603
                                    }
                                },
                                "4782739": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.82163522930108,
                                        "TotalP": 0.438328733957203,
                                        "Sediment": 265.564134866722
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 265.315917857076,
                                        "TotalP": 19.9764474743546,
                                        "Sediment": 12102.852448992
                                    }
                                },
                                "4782743": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.00183792945958,
                                        "TotalP": 0.0541106114169907,
                                        "Sediment": 124.032505848497
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 343.461674488242,
                                        "TotalP": 9.28392899912703,
                                        "Sediment": 21280.6499081561
                                    }
                                }
                            }
                        },
                        "020402031004": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 304.315775441143,
                                    "TotalP": 29.2971004435404,
                                    "Sediment": 14113.1785253968,
                                    "Area": 211.938683214523
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 3.28972260114316,
                                    "TotalP": 0.114860409116316,
                                    "Sediment": 15.1553082995362,
                                    "Area": 5.9396828416808995
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 228.396725685937,
                                    "TotalP": 23.0703016370282,
                                    "Sediment": 8851.81325222118,
                                    "Area": 738.5005666489918
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 4.02045106742831,
                                    "TotalP": 0.426514473820118,
                                    "Sediment": 421.081568394,
                                    "Area": 4.769745312258904
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 6920.43500552796,
                                    "TotalP": 1489.58391954297,
                                    "Sediment": 0,
                                    "Area": 480.2143582304436
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 0,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 4298.9
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 329.622941661323,
                                    "TotalP": 105.748894283977,
                                    "Sediment": 92692.1766334152,
                                    "Area": 294.3742814414882
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 16555.7813913353,
                                    "TotalP": 344.134088843891,
                                    "Sediment": 0,
                                    "Area": 4298.9
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 527.894882969975,
                                    "TotalP": 53.2829285564259,
                                    "Sediment": 20447.5661496021,
                                    "Area": 1706.9388554266911
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 20.5202747771938,
                                    "TotalP": 1.14319769901857,
                                    "Sediment": 173.498533610238,
                                    "Area": 57.50692933081962
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 131455.492240497,
                                    "TotalP": 45279.2316053975,
                                    "Sediment": 207703917.774885,
                                    "Area": 4298.9
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 1314.9979349881,
                                    "TotalP": 348.559438077743,
                                    "Sediment": 353711.382754258,
                                    "Area": 185.84007678895543
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 130.632732279013,
                                    "TotalP": 12.0063609353177,
                                    "Sediment": 7490.44198478768,
                                    "Area": 2130.0062651045996
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 962.350170472441,
                                    "TotalP": 92.6713607564308,
                                    "Sediment": 44639.5272416563,
                                    "Area": 670.1042187750907
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 2347.560204,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 738.5005666489918
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 161105.31045330394,
                                "TotalP": 47779.270571056775,
                                "Sediment": 208246473.59683666,
                                "Area": 4298.9
                            },
                            "Catchments": {
                                "4781877": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.25191467689595,
                                        "TotalP": 1.57062881587249,
                                        "Sediment": 6784.24244013698
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 9749.11593815572,
                                        "TotalP": 2811.23617698188,
                                        "Sediment": 11671569.5608214
                                    }
                                },
                                "4781883": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 7.8885094856315,
                                        "TotalP": 2.30366033296392,
                                        "Sediment": 10117.6177147343
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 8797.46763827093,
                                        "TotalP": 2569.10095192668,
                                        "Sediment": 11283426.1762501
                                    }
                                },
                                "4781889": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.1525610952976,
                                        "TotalP": 1.10128766706443,
                                        "Sediment": 3996.11325644932
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 432.7247888616,
                                        "TotalP": 106.550145199463,
                                        "Sediment": 269457.983424993
                                    }
                                },
                                "4781891": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.96790351384189,
                                        "TotalP": 1.47657905000037,
                                        "Sediment": 6263.57372534108
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3861.20503470587,
                                        "TotalP": 1072.82354635566,
                                        "Sediment": 4242519.30063352
                                    }
                                },
                                "4781897": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.10574732931812,
                                        "TotalP": 1.52669914616066,
                                        "Sediment": 6517.73171504885
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 244.987619805267,
                                        "TotalP": 69.0644745193091,
                                        "Sediment": 248555.98449313
                                    }
                                },
                                "4781903": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.12761460886721,
                                        "TotalP": 1.53320696869901,
                                        "Sediment": 6547.06276249017
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 118.479007262499,
                                        "TotalP": 34.8168719785849,
                                        "Sediment": 130582.9461104
                                    }
                                },
                                "4781905": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 325.079052468391,
                                        "TotalP": 101.870986468398,
                                        "Sediment": 457275.893775587
                                    }
                                },
                                "4781907": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 6.84120087484808,
                                        "TotalP": 2.17830461598755,
                                        "Sediment": 9549.4783777559
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 24251.7277149358,
                                        "TotalP": 7721.98498385578,
                                        "Sediment": 33852441.0660791
                                    }
                                },
                                "4781911": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 6.09607457563704,
                                        "TotalP": 1.85574310757697,
                                        "Sediment": 8263.44007148352
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7475.70200834502,
                                        "TotalP": 2248.64297514402,
                                        "Sediment": 9962738.87894297
                                    }
                                },
                                "4781927": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.09212632303799,
                                        "TotalP": 0.965619166000598,
                                        "Sediment": 4329.46144053461
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 19.6256305385993,
                                        "TotalP": 6.0767700752337,
                                        "Sediment": 27225.7887663813
                                    }
                                },
                                "4781929": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.92058337482201,
                                        "TotalP": 1.45020821195625,
                                        "Sediment": 6135.38927581611
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 10527.0897830305,
                                        "TotalP": 3354.14024894528,
                                        "Sediment": 14693843.2088069
                                    }
                                },
                                "4781931": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.65516244353333,
                                        "TotalP": 1.3025402116896,
                                        "Sediment": 5238.83931313951
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 10849.02145372,
                                        "TotalP": 3035.61623732031,
                                        "Sediment": 12209301.1340122
                                    }
                                },
                                "4781933": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.82109233814763,
                                        "TotalP": 1.38583466520984,
                                        "Sediment": 5792.2378823368
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 374.774089013576,
                                        "TotalP": 110.795274992567,
                                        "Sediment": 494995.920234321
                                    }
                                },
                                "4781935": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 4.87029942265372,
                                        "TotalP": 1.39760233228281,
                                        "Sediment": 5771.12375051695
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2395.00321066929,
                                        "TotalP": 685.506102034311,
                                        "Sediment": 2836349.33840928
                                    }
                                },
                                "4781949": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.30639219747953,
                                        "TotalP": 1.59021633067757,
                                        "Sediment": 7105.87457312621
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 8037.42972576134,
                                        "TotalP": 2408.65196746105,
                                        "Sediment": 10763050.56168
                                    }
                                },
                                "4781963": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.17501406387311,
                                        "TotalP": 1.51421756479839,
                                        "Sediment": 6748.73242366804
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4740.05673934926,
                                        "TotalP": 1386.94834144892,
                                        "Sediment": 6181504.86395604
                                    }
                                },
                                "4781965": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.46219755846497,
                                        "TotalP": 1.59636584662752,
                                        "Sediment": 6695.14454291664
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 16502.9169859809,
                                        "TotalP": 4823.09414190296,
                                        "Sediment": 20228015.0833553
                                    }
                                },
                                "4782171": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.24086219679843,
                                        "TotalP": 1.55745743076828,
                                        "Sediment": 6705.48942340566
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6055.93132288846,
                                        "TotalP": 1627.27940108774,
                                        "Sediment": 6063299.20112617
                                    }
                                },
                                "4782177": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.13152095675575,
                                        "TotalP": 1.54276510785707,
                                        "Sediment": 6580.79282820661
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 9362.06815941359,
                                        "TotalP": 2734.3684534812,
                                        "Sediment": 11137835.8924646
                                    }
                                },
                                "4782183": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 6.18934233906874,
                                        "TotalP": 1.89497962453826,
                                        "Sediment": 8438.35670033201
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 43472.5575610494,
                                        "TotalP": 13309.913443429,
                                        "Sediment": 59269131.8850276
                                    }
                                },
                                "4782565": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 5.24091846292656,
                                        "TotalP": 1.55715119845117,
                                        "Sediment": 6704.51278797809
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 11.184851562677,
                                        "TotalP": 3.25052325362761,
                                        "Sediment": 14744.6332586278
                                    }
                                },
                                "4782735": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.84036719877211,
                                        "TotalP": 1.03874604549365,
                                        "Sediment": 4037.52617895425
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1671.28245255065,
                                        "TotalP": 452.050012052227,
                                        "Sediment": 1757083.71240063
                                    }
                                },
                                "4782741": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.40106017238343,
                                        "TotalP": 1.06410002910756,
                                        "Sediment": 4771.78659119211
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 88.137444467526,
                                        "TotalP": 27.5758300264459,
                                        "Sediment": 123659.404531307
                                    }
                                }
                            }
                        },
                        "020402031005": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 317.083281209108,
                                    "TotalP": 28.1337257224654,
                                    "Sediment": 13384.3863648728,
                                    "Area": 208.67808381868227
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 3.95991883888005,
                                    "TotalP": 0.115484020574971,
                                    "Sediment": 4.24897488335866,
                                    "Area": 6.661854272037311
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 427.698337887724,
                                    "TotalP": 39.5664153643188,
                                    "Sediment": 15219.0001050614,
                                    "Area": 1196.88314252346
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 7.32953208854293,
                                    "TotalP": 0.452990903519438,
                                    "Sediment": 341.499013198427,
                                    "Area": 6.481804156576843
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 860.542854197409,
                                    "TotalP": 195.657743819414,
                                    "Sediment": 0,
                                    "Area": 703.4558011040479
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 0,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 3594
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 782.469529604405,
                                    "TotalP": 267.395045606449,
                                    "Sediment": 191143.160625129,
                                    "Area": 343.0854950099215
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 22375.7103962958,
                                    "TotalP": 325.920744414396,
                                    "Sediment": 0,
                                    "Area": 3594
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 675.441054620583,
                                    "TotalP": 62.4524048647448,
                                    "Sediment": 24024.882587861,
                                    "Area": 1890.1661121039917
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 26.4263028746333,
                                    "TotalP": 1.32465915618849,
                                    "Sediment": 146.710869614263,
                                    "Area": 53.11478406083802
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 2266.90841483841,
                                    "TotalP": 957.210971172853,
                                    "Sediment": 3949585.96055801,
                                    "Area": 3594
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 3193.44345723191,
                                    "TotalP": 824.164955219658,
                                    "Sediment": 698782.395618759,
                                    "Area": 360.3703060941264
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 116.651650988444,
                                    "TotalP": 7.12018218018086,
                                    "Sediment": 2172.1522726514,
                                    "Area": 880.6251147171483
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 817.397246241017,
                                    "TotalP": 72.4415316580124,
                                    "Sediment": 34472.618633805,
                                    "Area": 537.989744995878
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 1885.692864,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 1196.88314252346
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 33756.75484091686,
                                "TotalP": 2781.9568541027757,
                                "Sediment": 4929277.015623845,
                                "Area": 3594
                            },
                            "Catchments": {
                                "4781571": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.728502001648245,
                                        "TotalP": 0.0676274550117213,
                                        "Sediment": 151.187606357388
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3057.73222384045,
                                        "TotalP": 283.851860307595,
                                        "Sediment": 634577.825123817
                                    }
                                },
                                "4781573": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.14868174189946,
                                        "TotalP": 0.131198361394737,
                                        "Sediment": 173.175685845294
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5952.52142635289,
                                        "TotalP": 679.875921082512,
                                        "Sediment": 897404.340050606
                                    }
                                },
                                "4781649": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.17158265488978,
                                        "TotalP": 0.140292869334681,
                                        "Sediment": 179.649544578893
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3474.78810622689,
                                        "TotalP": 416.093556624441,
                                        "Sediment": 532821.221094764
                                    }
                                },
                                "4781651": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.15575064808326,
                                        "TotalP": 0.101901622885069,
                                        "Sediment": 183.786959923269
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1279.62758176071,
                                        "TotalP": 112.823754402532,
                                        "Sediment": 203485.815453182
                                    }
                                },
                                "4781655": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.13812009643263,
                                        "TotalP": 0.126133253613255,
                                        "Sediment": 175.315075249071
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 37.8569133224647,
                                        "TotalP": 2.81538840716574,
                                        "Sediment": 2570.88313833182
                                    }
                                },
                                "4781659": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.32192953724081,
                                        "TotalP": 0.0859505453804651,
                                        "Sediment": 201.874825978583
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2099.6847614847,
                                        "TotalP": 129.032564218825,
                                        "Sediment": 303628.709997876
                                    }
                                },
                                "4781661": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.0210281025843,
                                        "TotalP": 0.106947760685562,
                                        "Sediment": 171.382189971929
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2822.67719666362,
                                        "TotalP": 276.758238425945,
                                        "Sediment": 455546.421990493
                                    }
                                },
                                "4781663": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.3137612563236,
                                        "TotalP": 0.134663600422289,
                                        "Sediment": 193.364209512133
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3671.51816352467,
                                        "TotalP": 450.573059138483,
                                        "Sediment": 503225.085643246
                                    }
                                },
                                "4781759": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.20390437989857,
                                        "TotalP": 0.112920782055209,
                                        "Sediment": 193.382552849768
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5162.91853109559,
                                        "TotalP": 296.584551575085,
                                        "Sediment": 730032.553149393
                                    }
                                },
                                "4782155": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.917752720445147,
                                        "TotalP": 0.0740395110003828,
                                        "Sediment": 186.773359391781
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2883.81702932194,
                                        "TotalP": 241.022352596115,
                                        "Sediment": 613587.675343596
                                    }
                                },
                                "4782157": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.16835476363319,
                                        "TotalP": 0.121988402154419,
                                        "Sediment": 183.236812758607
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1196.96392424184,
                                        "TotalP": 148.256577226569,
                                        "Sediment": 172671.491026118
                                    }
                                },
                                "4782689": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.885474954699649,
                                        "TotalP": 0.0674077933273264,
                                        "Sediment": 167.266945088441
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1808.0507928385,
                                        "TotalP": 137.639933825465,
                                        "Sediment": 341542.277483628
                                    }
                                },
                                "4782697": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.25252040289209,
                                        "TotalP": 0.0955399833172379,
                                        "Sediment": 223.277338961135
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 670.439775404138,
                                        "TotalP": 51.1399293851206,
                                        "Sediment": 119514.227984064
                                    }
                                }
                            }
                        },
                        "020402031006": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 737.404755098468,
                                    "TotalP": 62.3834614054298,
                                    "Sediment": 29906.6390487643,
                                    "Area": 506.05381341164235
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 3.11094576193475,
                                    "TotalP": 0.0904457113896768,
                                    "Sediment": 8.15762763559498,
                                    "Area": 8.639723650634476
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 747.360365571089,
                                    "TotalP": 59.6131321549325,
                                    "Sediment": 23189.6541024128,
                                    "Area": 2230.0386701986636
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 65.2339974287497,
                                    "TotalP": 3.53482529277568,
                                    "Sediment": 3034.21381408207,
                                    "Area": 56.06820660776332
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 6059.04494923953,
                                    "TotalP": 885.038622282399,
                                    "Sediment": 0,
                                    "Area": 2192.9598561980238
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 13607.26,
                                    "TotalP": 53412.3276545577,
                                    "Sediment": 0,
                                    "Area": 9565.2
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 2600.73964813356,
                                    "TotalP": 638.965001474245,
                                    "Sediment": 468986.565379962,
                                    "Area": 1387.4856200190804
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 61725.658722543,
                                    "TotalP": 619.62742554651,
                                    "Sediment": 0,
                                    "Area": 9565.2
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 1192.39167922214,
                                    "TotalP": 95.6830604842156,
                                    "Sediment": 37188.2177846916,
                                    "Area": 3557.85619875555
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 99.573211590034,
                                    "TotalP": 4.15878253803299,
                                    "Sediment": 180.971412391814,
                                    "Area": 283.8509207718868
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 10145.972071615,
                                    "TotalP": 3915.32168073949,
                                    "Sediment": 17028078.8581947,
                                    "Area": 9565.2
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 6714.88135600683,
                                    "TotalP": 1038.23897914641,
                                    "Sediment": 997271.376809416,
                                    "Area": 805.4742361789434
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 277.453113100643,
                                    "TotalP": 16.2103557358435,
                                    "Sediment": 6016.50907578327,
                                    "Area": 2981.6046306825024
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 1902.7403076133,
                                    "TotalP": 154.491861049331,
                                    "Sediment": 74671.5968624411,
                                    "Area": 1305.9482280662178
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 4575.671958,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 2230.0386701986636
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 110454.4970809243,
                                "TotalP": 60905.685288118715,
                                "Sediment": 18668532.760112282,
                                "Area": 9565.2
                            },
                            "Catchments": {
                                "4781427": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.88763562934263,
                                        "TotalP": 0.36264897900784,
                                        "Sediment": 435.559411838784
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5627.89774287323,
                                        "TotalP": 706.78978665952,
                                        "Sediment": 848889.591839784
                                    }
                                },
                                "4781429": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.32888913467904,
                                        "TotalP": 0.252841115583518,
                                        "Sediment": 420.480844243757
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3748.0956728241,
                                        "TotalP": 406.920482868415,
                                        "Sediment": 676718.530456217
                                    }
                                },
                                "4781461": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.29187727433661,
                                        "TotalP": 0.260623539436703,
                                        "Sediment": 405.684832156679
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3598.37177822393,
                                        "TotalP": 362.135812756062,
                                        "Sediment": 771398.661681546
                                    }
                                },
                                "4781495": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.291684038103,
                                        "TotalP": 0.255599068530953,
                                        "Sediment": 392.053448298395
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1287.06326214815,
                                        "TotalP": 141.501915070704,
                                        "Sediment": 226888.020106268
                                    }
                                },
                                "4781535": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.1507568096767,
                                        "TotalP": 0.226419920671973,
                                        "Sediment": 379.757251737544
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2990.0234904247,
                                        "TotalP": 238.798700416653,
                                        "Sediment": 625829.847400054
                                    }
                                },
                                "4781569": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.46422559837886,
                                        "TotalP": 0.235526611576877,
                                        "Sediment": 413.336296700858
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2536.76994889735,
                                        "TotalP": 242.460280749824,
                                        "Sediment": 425504.506141426
                                    }
                                },
                                "4781637": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.23405450220241,
                                        "TotalP": 0.299003627872579,
                                        "Sediment": 310.101938412737
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 23749.8905231395,
                                        "TotalP": 2195.78965758284,
                                        "Sediment": 2277292.19878649
                                    }
                                },
                                "4781713": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.42787896561347,
                                        "TotalP": 0.158877859100036,
                                        "Sediment": 364.107753994168
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1450.77479294721,
                                        "TotalP": 161.425441995163,
                                        "Sediment": 369946.167800302
                                    }
                                },
                                "4781719": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.16818570034737,
                                        "TotalP": 0.132390652861579,
                                        "Sediment": 400.776346853519
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1434.3223276945,
                                        "TotalP": 162.551954985366,
                                        "Sediment": 492081.406691505
                                    }
                                },
                                "4781721": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 73.7032855125024,
                                        "TotalP": 8.56488877145495,
                                        "Sediment": 30121.0558476219
                                    }
                                },
                                "4781723": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 260.42315010253,
                                        "TotalP": 39.2067430666092,
                                        "Sediment": 120945.939141552
                                    }
                                },
                                "4781743": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.18316717567781,
                                        "TotalP": 0.150699214303818,
                                        "Sediment": 520.95950867107
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2619.96539537684,
                                        "TotalP": 333.703245579218,
                                        "Sediment": 1153595.12431437
                                    }
                                },
                                "4781815": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.0266118447889,
                                        "TotalP": 0.0888925412672212,
                                        "Sediment": 208.354776509403
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1694.42092745743,
                                        "TotalP": 146.71697290715,
                                        "Sediment": 343889.16847715
                                    }
                                },
                                "4781827": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.92248563848366,
                                        "TotalP": 0.321797141989415,
                                        "Sediment": 421.552354904745
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3904.77746560587,
                                        "TotalP": 2868.69157540543,
                                        "Sediment": 2192178.73017512
                                    }
                                },
                                "4781837": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.762896974013334,
                                        "TotalP": 0.1132514671322,
                                        "Sediment": 395.376526646311
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 253.84315110867,
                                        "TotalP": 38.0890110624276,
                                        "Sediment": 126004.805781893
                                    }
                                },
                                "4781863": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.0502183547455,
                                        "TotalP": 0.116141949937773,
                                        "Sediment": 388.691914434284
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5245.30482227943,
                                        "TotalP": 611.154225980245,
                                        "Sediment": 2042233.97009106
                                    }
                                },
                                "4781867": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.84905296058664,
                                        "TotalP": 0.0962252723012772,
                                        "Sediment": 270.188463326834
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1448.61225629873,
                                        "TotalP": 180.835420563907,
                                        "Sediment": 397564.581851375
                                    }
                                },
                                "4781881": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.796737031180287,
                                        "TotalP": 0.0726877519201914,
                                        "Sediment": 245.96793535364
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 219.613158998219,
                                        "TotalP": 22.4233199133826,
                                        "Sediment": 77991.2729356886
                                    }
                                },
                                "4781909": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.757217700169799,
                                        "TotalP": 0.121416293439399,
                                        "Sediment": 435.61556801841
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1127.98804682622,
                                        "TotalP": 180.867573035965,
                                        "Sediment": 648913.982895536
                                    }
                                },
                                "4781915": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.90271072582207,
                                        "TotalP": 0.124421046679893,
                                        "Sediment": 427.045186724291
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1298.74120400926,
                                        "TotalP": 179.006114967761,
                                        "Sediment": 614395.247677585
                                    }
                                },
                                "4781917": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.735802569730021,
                                        "TotalP": 0.0644220375219001,
                                        "Sediment": 216.143171112958
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 707.492291040106,
                                        "TotalP": 61.9433755668511,
                                        "Sediment": 207826.981875708
                                    }
                                },
                                "4781923": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.90796505054073,
                                        "TotalP": 0.100983556143352,
                                        "Sediment": 329.128937175176
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 902.239963552715,
                                        "TotalP": 100.346813965957,
                                        "Sediment": 327053.646067354
                                    }
                                },
                                "4781937": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.851826265987946,
                                        "TotalP": 0.0894810839151148,
                                        "Sediment": 282.590762699673
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1762.94077610706,
                                        "TotalP": 185.1901706051,
                                        "Sediment": 584850.219353881
                                    }
                                },
                                "4782115": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.54037849846551,
                                        "TotalP": 0.254696243136768,
                                        "Sediment": 341.556780940868
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2258.75771791863,
                                        "TotalP": 226.46117704805,
                                        "Sediment": 303692.546415286
                                    }
                                },
                                "4782129": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.13625165311636,
                                        "TotalP": 0.193451050074114,
                                        "Sediment": 370.204098240664
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1788.71085761069,
                                        "TotalP": 161.979040802132,
                                        "Sediment": 309976.630837968
                                    }
                                },
                                "4782467": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.15017261205682,
                                        "TotalP": 0.22603088571779,
                                        "Sediment": 379.241585697873
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 9.58602777723353,
                                        "TotalP": 0.37467464985758,
                                        "Sediment": 973.696949114683
                                    }
                                },
                                "4782469": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.14978465209949,
                                        "TotalP": 0.205231182193093,
                                        "Sediment": 352.388299430388
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3.83954180313552,
                                        "TotalP": 0.158345115518798,
                                        "Sediment": 434.156166428735
                                    }
                                },
                                "4782473": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.46227032477517,
                                        "TotalP": 0.235164493325797,
                                        "Sediment": 412.813323974562
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2.38778507582355,
                                        "TotalP": 0.0951611848153304,
                                        "Sediment": 263.744098574052
                                    }
                                },
                                "4782483": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2593.66094967257,
                                        "TotalP": 310.269005980264,
                                        "Sediment": 361375.113353177
                                    }
                                },
                                "4782485": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.23082962066418,
                                        "TotalP": 0.298379137335773,
                                        "Sediment": 309.875119520198
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 19.6240097346271,
                                        "TotalP": 1.26647662317749,
                                        "Sediment": 3966.23469085431
                                    }
                                },
                                "4782487": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2010.05390181021,
                                        "TotalP": 173.994648001808,
                                        "Sediment": 275006.905243391
                                    }
                                },
                                "4782489": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.20387165013796,
                                        "TotalP": 0.112660088957361,
                                        "Sediment": 193.038935402441
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.148232087778309,
                                        "TotalP": 0.0139176942656243,
                                        "Sediment": 52.7073501853163
                                    }
                                },
                                "4782491": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3113.24748375191,
                                        "TotalP": 320.369445342375,
                                        "Sediment": 1000989.8345631
                                    }
                                },
                                "4782493": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.0493738097767,
                                        "TotalP": 0.11596611500796,
                                        "Sediment": 388.144302386243
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 4.91369785539651,
                                        "TotalP": 0.349261311680702,
                                        "Sediment": 1172.67390052682
                                    }
                                },
                                "4782495": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1262.99361742333,
                                        "TotalP": 131.395648790892,
                                        "Sediment": 433436.885810944
                                    }
                                },
                                "4782497": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.18322961900804,
                                        "TotalP": 0.150612598700734,
                                        "Sediment": 520.713886268187
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5.42500296401382,
                                        "TotalP": 0.55289050302338,
                                        "Sediment": 1973.4603731185
                                    }
                                },
                                "4782503": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 5001.19766327857,
                                        "TotalP": 447.328007933434,
                                        "Sediment": 990102.058521417
                                    }
                                },
                                "4782505": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 883.562790702234,
                                        "TotalP": 97.6824860613423,
                                        "Sediment": 331741.562894906
                                    }
                                },
                                "4782509": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.42746010916963,
                                        "TotalP": 0.15850836368502,
                                        "Sediment": 363.508952128329
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.850020236943564,
                                        "TotalP": 0.078362919435782,
                                        "Sediment": 266.694938492724
                                    }
                                },
                                "4782511": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 25.0573789146922,
                                        "TotalP": 3.29438448778098,
                                        "Sediment": 11684.8519280503
                                    }
                                },
                                "4782513": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 563.458671664887,
                                        "TotalP": 79.0436805267201,
                                        "Sediment": 261204.933881239
                                    }
                                },
                                "4782515": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6.49886978005664,
                                        "TotalP": 0.750973603518626,
                                        "Sediment": 1889.37154234767
                                    }
                                },
                                "4782519": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 59.0475193472869,
                                        "TotalP": 8.28769684271703,
                                        "Sediment": 29750.7964925214
                                    }
                                },
                                "4782521": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.16838134535739,
                                        "TotalP": 0.131626576706418,
                                        "Sediment": 399.009128011775
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.240216950164015,
                                        "TotalP": 0.0163181179088733,
                                        "Sediment": 52.7764660678063
                                    }
                                },
                                "4782523": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 90.6305205961265,
                                        "TotalP": 11.1126817326719,
                                        "Sediment": 39455.990352902
                                    }
                                },
                                "4782525": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.14478796723659,
                                        "TotalP": 0.0808360293014083,
                                        "Sediment": 263.882330339032
                                    }
                                },
                                "4782527": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 813.334469168921,
                                        "TotalP": 93.7523081504162,
                                        "Sediment": 303418.363616317
                                    }
                                },
                                "4782531": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1824.15788738369,
                                        "TotalP": 1179.77393150742,
                                        "Sediment": 471093.178216414
                                    }
                                },
                                "4782533": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 49.9513168176118,
                                        "TotalP": 4.77384190437385,
                                        "Sediment": 16508.8069729987
                                    }
                                },
                                "4782535": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.71655318915705,
                                        "TotalP": 0.126610543852114,
                                        "Sediment": 130.020937550596
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.149608239774865,
                                        "TotalP": 0.0139361391841218,
                                        "Sediment": 52.7073501853163
                                    }
                                },
                                "4782537": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.922399061194638,
                                        "TotalP": 0.321424939699998,
                                        "Sediment": 421.203156099976
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3.11718837615592,
                                        "TotalP": 0.288319929934004,
                                        "Sediment": 1025.29521832442
                                    }
                                },
                                "4782541": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 472.967726615822,
                                        "TotalP": 69.4079846540992,
                                        "Sediment": 226029.92553861
                                    }
                                },
                                "4782549": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 14316.9277554264,
                                        "TotalP": 56486.053866757,
                                        "Sediment": 340162.250070936
                                    }
                                },
                                "4782551": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.02667022161303,
                                        "TotalP": 0.0888841312489097,
                                        "Sediment": 208.355869968004
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.0963508389147472,
                                        "TotalP": 0.0143898434862904,
                                        "Sediment": 52.7764660678063
                                    }
                                },
                                "4782557": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7819.46675369047,
                                        "TotalP": 999.160536902931,
                                        "Sediment": 1951106.87204537
                                    }
                                },
                                "4782559": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 145.756705744142,
                                        "TotalP": 30.2155032317336,
                                        "Sediment": 35350.4782588727
                                    }
                                },
                                "4782731": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.811104379383467,
                                        "TotalP": 0.070440752125355,
                                        "Sediment": 235.215692136581
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 544.33320020175,
                                        "TotalP": 47.2728800430815,
                                        "Sediment": 157853.555834203
                                    }
                                },
                                "4787601": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2.45334843379179,
                                        "TotalP": 0.168792883484605,
                                        "Sediment": 580.057315568439
                                    }
                                }
                            }
                        },
                        "020402031007": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 1429.61846571463,
                                    "TotalP": 122.791213263903,
                                    "Sediment": 55749.2315134863,
                                    "Area": 958.7453211515681
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 48.2227166836726,
                                    "TotalP": 1.33225605876686,
                                    "Sediment": 14.1127811779877,
                                    "Area": 87.48596058574203
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 744.151241270432,
                                    "TotalP": 65.372439145812,
                                    "Sediment": 25519.3535965128,
                                    "Area": 2329.4487097938163
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 9.01398857870446,
                                    "TotalP": 0.393476431599923,
                                    "Sediment": 324.504738446463,
                                    "Area": 8.820600964406088
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 1979.61551809416,
                                    "TotalP": 427.683994866917,
                                    "Sediment": 0,
                                    "Area": 269.11833554667555
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 416059.35,
                                    "TotalP": 68715.8394744597,
                                    "Sediment": 0,
                                    "Area": 9004.1
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 220.471563869079,
                                    "TotalP": 58.0845333220519,
                                    "Sediment": 59361.5140941844,
                                    "Area": 190.27296366075993
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 44612.3186106625,
                                    "TotalP": 729.375873187936,
                                    "Sediment": 0,
                                    "Area": 9004.1
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 1480.12429426211,
                                    "TotalP": 132.169699899316,
                                    "Sediment": 51392.6270743933,
                                    "Area": 4633.2456718850235
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 52.5259917083333,
                                    "TotalP": 2.3738211810855,
                                    "Sediment": 63.7688169835402,
                                    "Area": 150.13022865948324
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 12118.053047329,
                                    "TotalP": 3883.9780222958,
                                    "Sediment": 20546170.795226,
                                    "Area": 9004.1
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 398.63007700823,
                                    "TotalP": 58.0209150636894,
                                    "Sediment": 45420.5198305367,
                                    "Area": 78.84537188591565
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 194.649155671395,
                                    "TotalP": 13.3508698489697,
                                    "Sediment": 7276.97832049211,
                                    "Area": 3361.9090532907776
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 2741.72995834247,
                                    "TotalP": 234.016382553071,
                                    "Sediment": 106386.455094224,
                                    "Area": 1838.5552642849304
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 6442.25307,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 2329.4487097938163
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 488530.7276991946,
                                "TotalP": 74444.78297157864,
                                "Sediment": 20897679.861086436,
                                "Area": 9004.1
                            },
                            "Catchments": {
                                "4781701": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.30438922715055,
                                        "TotalP": 0.121619310602117,
                                        "Sediment": 390.463590191307
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 796.115441375722,
                                        "TotalP": 74.2286191302931,
                                        "Sediment": 238313.907364418
                                    }
                                },
                                "4781709": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.28892403678817,
                                        "TotalP": 0.12182585627172,
                                        "Sediment": 409.326557313881
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2411.86025391893,
                                        "TotalP": 227.962961551699,
                                        "Sediment": 765939.982715264
                                    }
                                },
                                "4781751": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.28771531350835,
                                        "TotalP": 0.108211141434128,
                                        "Sediment": 380.801277176881
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3874.67882421656,
                                        "TotalP": 292.988209369421,
                                        "Sediment": 1090218.27976998
                                    }
                                },
                                "4781761": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.30607334674109,
                                        "TotalP": 0.16468157657689,
                                        "Sediment": 402.773402552525
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 591.730107122863,
                                        "TotalP": 74.6107002276364,
                                        "Sediment": 182480.677087036
                                    }
                                },
                                "4781763": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.08897120635276,
                                        "TotalP": 0.121273738987519,
                                        "Sediment": 314.242076226289
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1630.94213011677,
                                        "TotalP": 181.630560144909,
                                        "Sediment": 470637.458716054
                                    }
                                },
                                "4781869": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 30.7387535177425,
                                        "TotalP": 6.23866033495982,
                                        "Sediment": 326.760732978647
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 102924.338895933,
                                        "TotalP": 20889.2657342593,
                                        "Sediment": 1094111.78301571
                                    }
                                },
                                "4781871": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.944622149244861,
                                        "TotalP": 0.0781116477756505,
                                        "Sediment": 282.581145308087
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1172.48828149074,
                                        "TotalP": 96.9541014236184,
                                        "Sediment": 350746.678668108
                                    }
                                },
                                "4781873": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.05082463544683,
                                        "TotalP": 0.129095528657014,
                                        "Sediment": 439.570883932286
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7645.56947059895,
                                        "TotalP": 956.252163764086,
                                        "Sediment": 3475189.41015822
                                    }
                                },
                                "4781875": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.762563159071995,
                                        "TotalP": 0.059605459900345,
                                        "Sediment": 219.192171573324
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 115.341654113503,
                                        "TotalP": 13.8514035422526,
                                        "Sediment": 57346.4458443731
                                    }
                                },
                                "4781887": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.757471887763319,
                                        "TotalP": 0.0571968208499713,
                                        "Sediment": 213.066122489911
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 263.105059340878,
                                        "TotalP": 36.6051887568815,
                                        "Sediment": 96741.4560690992
                                    }
                                },
                                "4781895": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.760695550216977,
                                        "TotalP": 0.0557898823849043,
                                        "Sediment": 212.434100759336
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 174.106291932649,
                                        "TotalP": 20.2454690364953,
                                        "Sediment": 84764.3919267002
                                    }
                                },
                                "4781901": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.610359576498464,
                                        "TotalP": 0.0456604611161289,
                                        "Sediment": 177.748644293575
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 278.359519572703,
                                        "TotalP": 22.1703451632152,
                                        "Sediment": 88174.3552053537
                                    }
                                },
                                "4781913": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.636037001156353,
                                        "TotalP": 0.0461925867880514,
                                        "Sediment": 177.892603779043
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 616.680562618615,
                                        "TotalP": 44.7868132789058,
                                        "Sediment": 172478.819289923
                                    }
                                },
                                "4781919": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.895551593767423,
                                        "TotalP": 0.0922498890408862,
                                        "Sediment": 228.567085459975
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 450.72444664866,
                                        "TotalP": 46.012616623058,
                                        "Sediment": 71655.110415532
                                    }
                                },
                                "4781939": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.82584802750081,
                                        "TotalP": 0.059147424384918,
                                        "Sediment": 222.740617036354
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1972.26515909207,
                                        "TotalP": 169.078081370539,
                                        "Sediment": 674153.940894854
                                    }
                                },
                                "4781943": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.2168667920101,
                                        "TotalP": 0.07552228455621,
                                        "Sediment": 267.627952115815
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 49.3863131658339,
                                        "TotalP": 3.29747102054296,
                                        "Sediment": 11906.5203983909
                                    }
                                },
                                "4781945": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 175.478308520728,
                                        "TotalP": 9.79362716864609,
                                        "Sediment": 33485.6691379421
                                    }
                                },
                                "4781947": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.21931404278821,
                                        "TotalP": 0.0755833052691996,
                                        "Sediment": 267.716481002243
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2483.17908268476,
                                        "TotalP": 153.928254787806,
                                        "Sediment": 545214.721052969
                                    }
                                },
                                "4781951": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.503907692258868,
                                        "TotalP": 0.0499727961311414,
                                        "Sediment": 208.89576936207
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 996.057135844317,
                                        "TotalP": 98.7795204343613,
                                        "Sediment": 412917.137240063
                                    }
                                },
                                "4781953": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.907145085166965,
                                        "TotalP": 0.0571915207897423,
                                        "Sediment": 207.884972382624
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 770.102437025859,
                                        "TotalP": 48.5515826052116,
                                        "Sediment": 176479.734576797
                                    }
                                },
                                "4781957": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.62153512891047,
                                        "TotalP": 0.125957785232466,
                                        "Sediment": 375.099261335046
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1393.86524022927,
                                        "TotalP": 66.9715147569909,
                                        "Sediment": 199439.563576586
                                    }
                                },
                                "4781959": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.870933292285213,
                                        "TotalP": 0.0618105493698307,
                                        "Sediment": 232.517308265024
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 245.546327090571,
                                        "TotalP": 23.7127250425054,
                                        "Sediment": 95185.2999351035
                                    }
                                },
                                "4781961": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.77125092309956,
                                        "TotalP": 0.128527424683114,
                                        "Sediment": 375.073933537118
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1706.61037593632,
                                        "TotalP": 77.033980630194,
                                        "Sediment": 220671.951584491
                                    }
                                },
                                "4781967": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 2.43401609195831,
                                        "TotalP": 0.159764185840675,
                                        "Sediment": 539.610130713046
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3273.46789280191,
                                        "TotalP": 214.864205087616,
                                        "Sediment": 725712.719548469
                                    }
                                },
                                "4781971": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.14532385111161,
                                        "TotalP": 0.0682801760125121,
                                        "Sediment": 236.085032524245
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3098.33771496059,
                                        "TotalP": 214.865322875967,
                                        "Sediment": 798095.936969548
                                    }
                                },
                                "4781973": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.990066019131263,
                                        "TotalP": 0.063366666279096,
                                        "Sediment": 226.899795065526
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2002.3300632334,
                                        "TotalP": 160.019583329822,
                                        "Sediment": 631141.719866013
                                    }
                                },
                                "4781975": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.2730907880504,
                                        "TotalP": 0.0821516596699472,
                                        "Sediment": 290.087797501369
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1979.50573550618,
                                        "TotalP": 127.736123004273,
                                        "Sediment": 451052.245719011
                                    }
                                },
                                "4782175": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.806854459876374,
                                        "TotalP": 0.0764100981009518,
                                        "Sediment": 236.88865172045
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1328.82772150778,
                                        "TotalP": 125.841600448278,
                                        "Sediment": 390137.531575356
                                    }
                                },
                                "4782499": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.33421418743988,
                                        "TotalP": 0.113819916552841,
                                        "Sediment": 403.714216742734
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.318427105612653,
                                        "TotalP": 0.0152169222874422,
                                        "Sediment": 55.2880541855938
                                    }
                                },
                                "4782501": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 2781.79899181723,
                                        "TotalP": 254.051655923853,
                                        "Sediment": 975649.838211547
                                    }
                                },
                                "4782553": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.944698860809463,
                                        "TotalP": 0.0778512615399273,
                                        "Sediment": 281.83648394539
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.939408866690506,
                                        "TotalP": 0.0499279835611468,
                                        "Sediment": 172.302622124938
                                    }
                                },
                                "4782561": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 32.8400826093064,
                                        "TotalP": 1.96729527659557,
                                        "Sediment": 7302.22028572313
                                    }
                                },
                                "4782563": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 30.7228451519519,
                                        "TotalP": 6.20394212488509,
                                        "Sediment": 325.425815214295
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.64160106363913,
                                        "TotalP": 0.0948201568253687,
                                        "Sediment": 352.568992643141
                                    }
                                },
                                "4782571": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 80.6874243377863,
                                        "TotalP": 4.72443328981416,
                                        "Sediment": 16933.314063065
                                    }
                                },
                                "4782577": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.895267958701803,
                                        "TotalP": 0.0921110487754876,
                                        "Sediment": 228.771659080554
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.820181525211422,
                                        "TotalP": 0.072802919117506,
                                        "Sediment": 309.204456753785
                                    }
                                },
                                "4782579": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.895241384872125,
                                        "TotalP": 0.0921235817530287,
                                        "Sediment": 228.633560759176
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.36520039828577,
                                        "TotalP": 0.13798368783211,
                                        "Sediment": 590.325078317114
                                    }
                                },
                                "4782585": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 305990.088709293,
                                        "TotalP": 62260.4745613766,
                                        "Sediment": 3857503.77080227
                                    }
                                },
                                "4782587": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.762510510370022,
                                        "TotalP": 0.0595020144546962,
                                        "Sediment": 218.895871325883
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.928056254866083,
                                        "TotalP": 0.0569880912901745,
                                        "Sediment": 221.230631640543
                                    }
                                },
                                "4782589": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.05074840247967,
                                        "TotalP": 0.128914508390501,
                                        "Sediment": 439.134807242127
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 3.03993817075824,
                                        "TotalP": 0.486350510995745,
                                        "Sediment": 1993.99037049344
                                    }
                                },
                                "4782591": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 59.7291811512797,
                                        "TotalP": 7.33773766948395,
                                        "Sediment": 30642.1228280006
                                    }
                                },
                                "4782593": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 23340.2280800833,
                                        "TotalP": 4190.411149753,
                                        "Sediment": 1717051.31846036
                                    }
                                },
                                "4782595": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 676.12013953309,
                                        "TotalP": 73.8093783996578,
                                        "Sediment": 172423.352756782
                                    }
                                },
                                "4782597": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.504936323386706,
                                        "TotalP": 0.0500167772824425,
                                        "Sediment": 209.102278165818
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6.99663904407099,
                                        "TotalP": 0.656836310734266,
                                        "Sediment": 2715.22858820264
                                    }
                                },
                                "4782599": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.806434695921491,
                                        "TotalP": 0.0762280397556254,
                                        "Sediment": 236.523674425774
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 0.749957416695608,
                                        "TotalP": 0.105344916130616,
                                        "Sediment": 463.007089061506
                                    }
                                },
                                "4782601": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 38.501691941801,
                                        "TotalP": 4.33346932598567,
                                        "Sediment": 18484.2025176101
                                    }
                                },
                                "4782603": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.759096373446824,
                                        "TotalP": 0.0555856205119996,
                                        "Sediment": 211.89417998018
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 38.788395711031,
                                        "TotalP": 3.31373910633611,
                                        "Sediment": 13436.7396061555
                                    }
                                },
                                "4782613": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1116.99286519963,
                                        "TotalP": 140.868727222482,
                                        "Sediment": 330520.914754885
                                    }
                                },
                                "4782615": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.989907678291719,
                                        "TotalP": 0.063291250907173,
                                        "Sediment": 226.685199188559
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1.74774739726432,
                                        "TotalP": 0.107729767364477,
                                        "Sediment": 406.176501216744
                                    }
                                },
                                "4782619": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1130.66062030991,
                                        "TotalP": 93.1893223489481,
                                        "Sediment": 365054.382295219
                                    }
                                },
                                "4782627": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 10189.6141772013,
                                        "TotalP": 695.287458685949,
                                        "Sediment": 2473731.58217535
                                    }
                                },
                                "4782727": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.545378235661709,
                                        "TotalP": 0.057435758505512,
                                        "Sediment": 244.212591695305
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 227.107700396007,
                                        "TotalP": 23.9175349908505,
                                        "Sediment": 101695.58754096
                                    }
                                },
                                "4782761": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.33415959301742,
                                        "TotalP": 0.113817307606965,
                                        "Sediment": 403.704737589313
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 698.956833312666,
                                        "TotalP": 68.6703652505401,
                                        "Sediment": 260173.69534914
                                    }
                                },
                                "4782775": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 0.762204937524649,
                                        "TotalP": 0.0589811517169526,
                                        "Sediment": 216.105980740265
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 129.762155124945,
                                        "TotalP": 22.5168854857011,
                                        "Sediment": 53641.5302618533
                                    }
                                }
                            }
                        },
                        "020402031008": {
                            "Loads": [
                                {
                                    "Source": "High-Density Mixed",
                                    "TotalN": 4501.49613130679,
                                    "TotalP": 448.855853954171,
                                    "Sediment": 169970.608399807,
                                    "Area": 2837.11840530116
                                },
                                {
                                    "Source": "Barren Areas",
                                    "TotalN": 0.862050664363929,
                                    "TotalP": 0.0264765401861451,
                                    "Sediment": 0.0348423960102701,
                                    "Area": 1.2601014458366242
                                },
                                {
                                    "Source": "Low-Density Mixed",
                                    "TotalN": 416.398488412072,
                                    "TotalP": 42.1279588524635,
                                    "Sediment": 14923.6684754255,
                                    "Area": 1122.3003520097764
                                },
                                {
                                    "Source": "Open Land",
                                    "TotalN": 18.4107320718723,
                                    "TotalP": 0.380634856125384,
                                    "Sediment": 49.5277625028756,
                                    "Area": 19.981608641123614
                                },
                                {
                                    "Source": "Farm Animals",
                                    "TotalN": 118.886762572302,
                                    "TotalP": 29.1520589689932,
                                    "Sediment": 0,
                                    "Area": 19.44156516433649
                                },
                                {
                                    "Source": "Point Sources",
                                    "TotalN": 9391.91,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 7090.4
                                },
                                {
                                    "Source": "Hay/Pasture",
                                    "TotalN": 10.4473471831781,
                                    "TotalP": 2.93755759447792,
                                    "Sediment": 31.6167340041455,
                                    "Area": 15.301231842301869
                                },
                                {
                                    "Source": "Subsurface Flow",
                                    "TotalN": 287252.468351667,
                                    "TotalP": 2106.22021304278,
                                    "Sediment": 0,
                                    "Area": 7090.4
                                },
                                {
                                    "Source": "Low-Density Open Space",
                                    "TotalN": 414.803091904747,
                                    "TotalP": 42.1882471751786,
                                    "Sediment": 14926.4436563355,
                                    "Area": 1117.9800041954793
                                },
                                {
                                    "Source": "Wetlands",
                                    "TotalN": 48.1630099009524,
                                    "TotalP": 2.39655493724417,
                                    "Sediment": 0.725199854220847,
                                    "Area": 138.07111556524154
                                },
                                {
                                    "Source": "Stream Bank Erosion",
                                    "TotalN": 3654.30039514563,
                                    "TotalP": 2428.9996715188,
                                    "Sediment": 13970057.0347917,
                                    "Area": 7090.4
                                },
                                {
                                    "Source": "Cropland",
                                    "TotalN": 13.9316601117334,
                                    "TotalP": 1.37512752532341,
                                    "Sediment": 0,
                                    "Area": 4.140333322034623
                                },
                                {
                                    "Source": "Wooded Areas",
                                    "TotalN": 27.6636678647919,
                                    "TotalP": 1.6440715679111,
                                    "Sediment": 399.941152623031,
                                    "Area": 313.4052310287947
                                },
                                {
                                    "Source": "Medium-Density Mixed",
                                    "TotalN": 4186.86263836042,
                                    "TotalP": 414.311833001388,
                                    "Sediment": 157169.120880676,
                                    "Area": 2638.8324420741537
                                },
                                {
                                    "Source": "Septic Systems",
                                    "TotalN": 9245.31003,
                                    "TotalP": 0,
                                    "Sediment": 0,
                                    "Area": 1122.3003520097764
                                }
                            ],
                            "SummaryLoads": {
                                "Source": "Entire area",
                                "TotalN": 319301.9143571658,
                                "TotalP": 5520.6162595350415,
                                "Sediment": 14327528.721895326,
                                "Area": 7090.4
                            },
                            "Catchments": {
                                "4781987": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 3.04999228820641,
                                        "TotalP": 0.0843417167496181,
                                        "Sediment": 286.337822293838
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 1493.57639151925,
                                        "TotalP": 41.3020050721217,
                                        "Sediment": 140219.177940481
                                    }
                                },
                                "4782629": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 7910.76384586113,
                                        "TotalP": 128.172954903082,
                                        "Sediment": 308265.874791912
                                    }
                                },
                                "4782633": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 75328.6515471049,
                                        "TotalP": 796.905280124687,
                                        "Sediment": 1002790.43282085
                                    }
                                },
                                "4784489": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.13618013779989,
                                        "TotalP": 0.105021717252565,
                                        "Sediment": 417.912673186574
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 6390.31213710921,
                                        "TotalP": 590.682350528218,
                                        "Sediment": 2350500.89230328
                                    }
                                },
                                "4784831": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 125499.419065035,
                                        "TotalP": 1348.72550014435,
                                        "Sediment": 1832645.34115179
                                    }
                                },
                                "4784833": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 119.731721044206,
                                        "TotalP": 23.0578327875146,
                                        "Sediment": 96433.0071715355
                                    }
                                },
                                "4784835": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 43975.6629746993,
                                        "TotalP": 1502.61776681857,
                                        "Sediment": 5096124.6025622
                                    }
                                },
                                "4784837": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 10974.1402935147,
                                        "TotalP": 40149.8739562868,
                                        "Sediment": 1359461.78546613
                                    }
                                },
                                "4784839": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": 1.13283347228398,
                                        "TotalP": 0.104055246446032,
                                        "Sediment": 414.943013101157
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 8.50948489716561,
                                        "TotalP": 1.62242959027663,
                                        "Sediment": 7229.34317092419
                                    }
                                },
                                "4784841": {
                                    "LoadingRateConcentrations": {
                                        "TotalN": null,
                                        "TotalP": null,
                                        "Sediment": null
                                    },
                                    "TotalLoadingRates": {
                                        "TotalN": 47753.0965012353,
                                        "TotalP": 937.532442833079,
                                        "Sediment": 2505990.41757067
                                    }
                                }
                            }
                        }
                    },
                    "inputmod_hash": "d751713988987e9331980363e24189ced751713988987e9331980363e24189ce"
                },
                "polling": false,
                "error": null,
                "active": false
            }
        ],
        "name": "New Scenario",
        "is_current_conditions": false,
        "inputmod_hash": "d751713988987e9331980363e24189cea81d1d89a4d53c28e2b08a846af045de",
        "modification_hash": "a81d1d89a4d53c28e2b08a846af045de",
        "created_at": "2018-11-21T19:10:33.319212Z",
        "modified_at": "2018-11-28T16:34:15.307494Z",
        "project": 48,
        "user_id": 2,
        "active": true,
        "is_subbasin_active": false,
        "job_id": null,
        "poll_error": null,
        "allow_save": true,
        "options_menu_is_open": false,
        "taskModel": {
            "taskName": "gwlfe",
            "taskType": "mmw/modeling",
            "pollInterval": 1000,
            "timeout": 160000,
            "job": "cafad70b-0432-4a40-8241-14eaa105bacd",
            "result": {
                "MeanFlow": 10717549462.372944,
                "monthly": [
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 0.5729185779496173,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 7.924799999999999,
                        "AvRunoff": 1.5764158854187598,
                        "AvGroundWater": 4.567045135421832,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 179.95550831565558
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 0.8723196977686928,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 7.248736666666668,
                        "AvRunoff": 1.5432040990842377,
                        "AvGroundWater": 4.755148669036126,
                        "AvPtSrcFlow": 156.99152658886518,
                        "AvStreamFlow": 163.28987935698555
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 2.53036925461453,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 8.751993333333331,
                        "AvRunoff": 1.4252179033280579,
                        "AvGroundWater": 5.586474616820065,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 180.82373981496312
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 5.043670083970272,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 8.906509999999999,
                        "AvRunoff": 0.34566348012861875,
                        "AvGroundWater": 5.338279660414788,
                        "AvPtSrcFlow": 168.20520705949838,
                        "AvStreamFlow": 173.8891502000418
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 9.1054511679753,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 9.634643333333335,
                        "AvRunoff": 0.37918415577614806,
                        "AvGroundWater": 3.7631363658883448,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 177.95436781647948
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 11.277727715806732,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 9.25576,
                        "AvRunoff": 0.43632925367370257,
                        "AvGroundWater": 2.009002660260069,
                        "AvPtSrcFlow": 168.20520705949838,
                        "AvStreamFlow": 170.65053897343216
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 10.564844817895892,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 10.811933333333334,
                        "AvRunoff": 0.7350328344530752,
                        "AvGroundWater": 0.9354855879503674,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 175.48256571721842
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 8.829383678649409,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 9.152890000000001,
                        "AvRunoff": 0.4791458131445576,
                        "AvGroundWater": 0.3865234816565334,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 174.67771658961607
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 5.491126335327011,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 8.694420000000003,
                        "AvRunoff": 0.5529687664550647,
                        "AvGroundWater": 0.440411826103213,
                        "AvPtSrcFlow": 168.20520705949838,
                        "AvStreamFlow": 169.19858765205666
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 4.0166013322744485,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 6.980766666666666,
                        "AvRunoff": 0.5949684700997341,
                        "AvGroundWater": 0.6988805790186436,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 175.10589634393335
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 2.2133938575650953,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 8.39724,
                        "AvRunoff": 1.0126495252635856,
                        "AvGroundWater": 1.3094287193573628,
                        "AvPtSrcFlow": 168.20520705949838,
                        "AvStreamFlow": 170.52728530411932
                    },
                    {
                        "AvWithdrawal": 0,
                        "AvEvapoTrans": 1.0746429207378023,
                        "AvTileDrain": 0,
                        "AvPrecipitation": 8.713893333333337,
                        "AvRunoff": 1.3489735648205943,
                        "AvGroundWater": 3.301715542625604,
                        "AvPtSrcFlow": 173.812047294815,
                        "AvStreamFlow": 178.46273640226119
                    }
                ],
                "watershed_id": null,
                "meta": {
                    "NRur": 10,
                    "SedDelivRatio": 0.06411293669858417,
                    "NLU": 16,
                    "NUrb": 6,
                    "WxYrBeg": 1961,
                    "NYrs": 30,
                    "WxYrEnd": 1990
                },
                "MeanFlowPerSecond": 339.851264027554,
                "inputmod_hash": "d751713988987e9331980363e24189cea81d1d89a4d53c28e2b08a846af045de",
                "AreaTotal": 51279.7,
                "SummaryLoads": [
                    {
                        "Source": "Total Loads",
                        "TotalN": 2331581.276546386,
                        "TotalP": 704248.9146853996,
                        "Sediment": 1985908048.666349,
                        "Unit": "kg"
                    },
                    {
                        "Source": "Loading Rates",
                        "TotalN": 45.46791959676804,
                        "TotalP": 13.73348351658453,
                        "Sediment": 38726.98258114515,
                        "Unit": "kg/ha"
                    },
                    {
                        "Source": "Mean Annual Concentration",
                        "TotalN": 0.217547983774843,
                        "TotalP": 0.0657098823903607,
                        "Sediment": 185.29497397128452,
                        "Unit": "mg/l"
                    },
                    {
                        "Source": "Mean Low-Flow Concentration",
                        "TotalN": 0.29156648237934363,
                        "TotalP": 0.07311574742723048,
                        "Sediment": 198.5688810068242,
                        "Unit": "mg/l"
                    }
                ],
                "Loads": [
                    {
                        "Source": "Hay/Pasture",
                        "TotalN": 2680.8311748730052,
                        "TotalP": 1011.1203957366364,
                        "Sediment": 525778.0520384308
                    },
                    {
                        "Source": "Cropland",
                        "TotalN": 9873.25696484862,
                        "TotalP": 2799.0725004634037,
                        "Sediment": 2366486.753943352
                    },
                    {
                        "Source": "Wooded Areas",
                        "TotalN": 1006.5166460955287,
                        "TotalP": 74.96563188203417,
                        "Sediment": 26327.765282334134
                    },
                    {
                        "Source": "Wetlands",
                        "TotalN": 511.7680589857378,
                        "TotalP": 27.28078040188129,
                        "Sediment": 413.7764039457631
                    },
                    {
                        "Source": "Open Land",
                        "TotalN": 155.94849000187577,
                        "TotalP": 11.39888005166138,
                        "Sediment": 9092.322783539701
                    },
                    {
                        "Source": "Barren Areas",
                        "TotalN": 65.64124300760453,
                        "TotalP": 2.210179025235355,
                        "Sediment": 25.160556438176936
                    },
                    {
                        "Source": "Low-Density Mixed",
                        "TotalN": 3097.7654150591356,
                        "TotalP": 331.36958518459045,
                        "Sediment": 122541.64527921462
                    },
                    {
                        "Source": "Medium-Density Mixed",
                        "TotalN": 12026.496670594364,
                        "TotalP": 1237.8511259235781,
                        "Sediment": 518413.490228742
                    },
                    {
                        "Source": "High-Density Mixed",
                        "TotalN": 7673.111183047478,
                        "TotalP": 789.7702529196068,
                        "Sediment": 330756.69983287377
                    },
                    {
                        "Source": "Low-Density Open Space",
                        "TotalN": 5622.2084802674735,
                        "TotalP": 601.410579016344,
                        "Sediment": 222403.7604414849
                    },
                    {
                        "Source": "Farm Animals",
                        "TotalN": 35168.6153589223,
                        "TotalP": 8233.004044437892,
                        "Sediment": 0
                    },
                    {
                        "Source": "Stream Bank Erosion",
                        "TotalN": 1144442,
                        "TotalP": 474117,
                        "Sediment": 1982008213
                    },
                    {
                        "Source": "Subsurface Flow",
                        "TotalN": 469466.8564549501,
                        "TotalP": 5868.151309373063,
                        "Sediment": 0
                    },
                    {
                        "Source": "Point Sources",
                        "TotalN": 617635.13,
                        "TotalP": 209745.72,
                        "Sediment": 0
                    },
                    {
                        "Source": "Septic Systems",
                        "TotalN": 27777.338886,
                        "TotalP": 0,
                        "Sediment": 0
                    }
                ]
            },
            "status": "complete",
            "started": "2018-11-28T16:34:13.642Z",
            "finished": "2018-11-28T16:34:14.490Z",
            "error": "",
            "job_uuid": "cafad70b-0432-4a40-8241-14eaa105bacd"
        }
    },
};

var polygons = {
    tr55SquareKm: {
        "type": "MultiPolygon",
        "coordinates": [
            [
                [
                    [
                        -75.16955741223396,
                        39.94798879320491
                    ],
                    [
                        -75.15782944384515,
                        39.94798879320491
                    ],
                    [
                        -75.15782944384515,
                        39.956979186977556
                    ],
                    [
                        -75.16955741223396,
                        39.956979186977556
                    ],
                    [
                        -75.16955741223396,
                        39.94798879320491
                    ]
                ]
            ]
        ]
    },
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
        "area": 44.422579883894436,
        "units":"km²"
    },

    sample1OutOfOrder: {
        "area": 44.422579883894436,
        "name":"Land Cover",
        "units":"km²",
        "shape":{"type":"Feature","geometry":{"coordinates":[[[-76.00479125976562,40.19251207621169],[-76.04324340820312,40.13794057716276],[-75.95260620117188,40.136890695345905],[-75.93338012695312,40.182020964319086],[-75.96221923828125,40.199854889057676],[-76.00479125976562,40.19251207621169]]], "type":"Polygon"},"properties":{}},
        "value":"developed_low"
    },

    sample2: {
        "name":"Conservation Practice",
        "value":"rain_garden",
        "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.53237915039062,40.18307014852534],[-75.66009521484375,40.107487419012415],[-75.50491333007812,40.10118506258701],[-75.43350219726561,40.13899044275822],[-75.42800903320312,40.1673306817866],[-75.53237915039062,40.18307014852534]]]}},
        "area": 106.40087636198604,
        "units":"km²"
    },

    // Identical to sample1 except has a slightly smaller area
    sample3: {
        "name":"Land Cover",
        "value":"developed_low",
        "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-76.00479125976562,40.19252207621169],[-76.04324340820312,40.13794057716276],[-75.95260620117188,40.136890695345905],[-75.93338012695312,40.182020964319086],[-75.96221923828125,40.199854889057676],[-76.00479125976562,40.19251207621169]]]}},
        "area": 10777.041602204828,
        "units":"km²"
    }
};

module.exports = {
    polling: polling,
    scenarios: scenarios,
    polygons: polygons,
    modifications: modifications
};

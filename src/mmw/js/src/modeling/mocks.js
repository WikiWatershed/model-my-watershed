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
                "units": "m<sup>2</sup>",
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
                            "inf": 1.9586814534290045,
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
                            "inf": 1.9586814534290045,
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
}};

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

"use strict";

var _ = require('lodash');

// These variable names include 'Name' to indicate
// that they reference the name of the variable, and not the value.
var n23Name = 'n23',
    n25Name = 'n25',
    n26Name = 'n26',
    n28bName = 'n28b',
    n41bName = 'n41b',
    n41dName = 'n41d',
    n42Name = 'n42',
    n42bName = 'n42b',
    n43Name = 'n43',
    n45Name = 'n45',
    n46cName = 'n46c',
    n25bName = 'n25b',
    n25cName = 'n25c',
    UrbLengthName = 'UrbLength',
    FilterWidthName = 'FilterWidth',
    PctStrmBufName = 'PctStrmBuf',
    UrbBankStabName = 'UrbBankStab',
    QretentionName = 'Qretention',
    PctAreaInfilName = 'PctAreaInfil',
    UrbAreaTotalName = 'UrbAreaTotal',
    lengthToModifyName = 'lengthToModify',
    lengthToModifyInAgName = 'lengthToModifyInAg',
    areaToModifyName = 'areaToModify',
    percentAeuToModifyName = 'percentAeuToModify',
    percentAreaToModifyName = 'percentAreaToModify',
    AREA = 'area',
    LENGTH = 'length',
    FilterWidthDefault = 30,
    QretentionDefault = 2.54;

// This function converts a list of pairs to objects. We use it to
// create objects where the keys are the values of variables, which is not
// possible with object literal syntax. For instance,
// x = {n23Name: 'y'} would create an object {'n23Name': 'y'} instead of
// {'n23': 'y'} which is what we want. We could also do {n23: 'y'} but that
// would defeat the point of using constants here which is to get
// spell-checking from the interpreter.
// This function is in lodash 4.12.2. In the future, we might want to upgrade
// to get it.
function fromPairs(pairs) {
    var obj = {};
    _.forEach(pairs, function(pair) {
        obj[pair[0]] = pair[1];
    });
    return obj;
}

var displayNames = fromPairs([
    [percentAeuToModifyName, '% of AEUs to modify'],
    [percentAreaToModifyName, '% of area to modify'],
    [areaToModifyName, 'Area to modify (ha)'],
    [lengthToModifyName, 'Length to modify (km)'],
    [lengthToModifyInAgName, 'Length to modify in ag areas (km)'],
    [n23Name, 'Area of row crops (ha)'],
    [n42Name, 'Length of streams in ag areas (km)'],
    [n42bName, 'Length of streams in watershed (km)'],
    [UrbAreaTotalName, 'Total urban area (ha)'],
    [UrbLengthName, 'Length of streams in non-ag areas (km)']
]);

function getPercentStr(fraction) {
    return Math.round(fraction * 100) + '%';
}

function convertToNumber(x) {
    x = x.trim();
    return (x !== '' && !isNaN(x)) ? Number(x) : null;
}

// infoMessages maps user input variable names to
// helpful, non-error messages to display in the UI.
function formatOutput(infoMessages, output) {
    return {
        infoMessages: infoMessages,
        output: output
    };
}

function formatValidation(cleanUserInput, errorMessages) {
    return {
        cleanUserInput: cleanUserInput,
        errorMessages: errorMessages
    };
}

function isValid(errorMessages) {
    return _.isEmpty(errorMessages);
}

function aggregateOutput(dataModel, userInput, validate, computeOutput) {
    var validation = validate(dataModel, userInput),
        output = computeOutput(dataModel, validation.cleanUserInput);

    return {
        errorMessages: validation.errorMessages,
        infoMessages: output.infoMessages,
        output: output.output
    };
}

function makeThresholdValidateFn(thresholdName, thresholdType, userInputName) {
    return function(dataModel, userInput) {
        var errorMessages = {},
            cleanUserInput = {},
            threshold = dataModel[thresholdName],
            userInputVal = convertToNumber(userInput[userInputName]),
            thresholdNum = Number(threshold).toFixed(2).toLocaleString('en', {
                minimumFractionDigits: 2
            }),
            errorMessage = 'Enter ' + thresholdType +
                ' > 0 and <= ' + thresholdNum;

        if (userInputVal) {
            if (userInputVal > threshold || userInputVal <= 0) {
                errorMessages[userInputName] = errorMessage;
            } else {
                cleanUserInput[userInputName] = userInputVal;
            }
        } else {
           errorMessages[userInputName] = errorMessage;
        }

        return formatValidation(cleanUserInput, errorMessages);
    };
}

function makePercentValidateFn(userInputName) {
    return function (dataModel, userInput) {
        var errorMessages = {},
            cleanUserInput = {},
            userInputVal = convertToNumber(userInput[userInputName]),
            errorMessage = 'Enter % > 0 and <= 100';

        if (userInputVal) {
            if (userInputVal > 100 || userInputVal <= 0) {
                errorMessages[userInputName] = errorMessage;
            } else {
                cleanUserInput[userInputName] = userInputVal;
            }
        } else {
           errorMessages[userInputName] = errorMessage;
        }

        return formatValidation(cleanUserInput, errorMessages);
    };
}

function makeComputeOutputFn(dataModelName, inputName, getOutput) {
    return function(dataModel, cleanUserInput) {
        var dataModelVal = dataModel[dataModelName],
            inputVal = cleanUserInput[inputName],
            output = {},
            infoMessages = {},
            fractionVal;

        if (inputVal) {
            fractionVal = inputVal / dataModelVal;
            infoMessages[inputName] = getPercentStr(fractionVal);
            output = getOutput(inputVal, fractionVal);
        }

        return formatOutput(infoMessages, output);
    };
}

// Returns a function that checks that each variable in dataModelNames
// is positive. Useful for checking if a BMP is applicable to an AOI.
function makeValidateDataModelFn(dataModelNames) {
    return function(dataModel) {
        return _.every(dataModelNames, function(dataModelName) {
            return dataModel[dataModelName] > 0;
        });
    };
}

function makeAgBmpConfig(outputName) {
    function getOutput(inputVal, fractionVal) {
        return fromPairs([
            [outputName, fractionVal * 100]
        ]);
    }

    return {
        dataModelNames: [n23Name],
        validateDataModel: makeValidateDataModelFn([n23Name]),
        userInputNames: [areaToModifyName],
        validate: makeThresholdValidateFn(n23Name, AREA, areaToModifyName),
        computeOutput: makeComputeOutputFn(n23Name, areaToModifyName, getOutput)
    };
}

function makeAeuBmpConfig(outputName) {
    return {
        dataModelNames: [],
        validateDataModel: makeValidateDataModelFn([]),
        userInputNames: [percentAeuToModifyName],
        validate: makePercentValidateFn(percentAeuToModifyName),
        computeOutput: function(dataModel, cleanUserInput) {
            var percentAeuToModify = cleanUserInput[percentAeuToModifyName],
                output = {},
                infoMessages = {};

            if (percentAeuToModify) {
                output[outputName] = percentAeuToModify;
            }

            return formatOutput(infoMessages, output);
        }

    };
}

function makeRuralStreamsBmpConfig(outputName) {
    function getOutput(inputVal) {
        return fromPairs([
            [outputName, inputVal]
        ]);
    }

    return {
        dataModelNames: [n42Name, n42bName],
        validateDataModel: makeValidateDataModelFn([n42Name]),
        userInputNames: [lengthToModifyInAgName],
        validate: makeThresholdValidateFn(n42Name, LENGTH, lengthToModifyInAgName),
        computeOutput: makeComputeOutputFn(n42Name, lengthToModifyInAgName, getOutput)
    };
}

function makeUrbanStreamsBmpConfig(getOutput) {
    return {
        dataModelNames: [UrbLengthName],
        validateDataModel: makeValidateDataModelFn([UrbLengthName]),
        userInputNames: [lengthToModifyName],
        validate: makeThresholdValidateFn(UrbLengthName, LENGTH, lengthToModifyName),
        computeOutput: makeComputeOutputFn(UrbLengthName, lengthToModifyName, getOutput)
    };
}

function makeUrbanAreaBmpConfig(getOutput) {
    return {
        dataModelNames: [UrbAreaTotalName],
        validateDataModel: makeValidateDataModelFn([UrbAreaTotalName]),
        userInputNames: [areaToModifyName],
        validate: makeThresholdValidateFn(UrbAreaTotalName, AREA, areaToModifyName),
        computeOutput: makeComputeOutputFn(UrbAreaTotalName, areaToModifyName, getOutput)
    };
}

/*
    configs contains a mapping from the BMP key to information needed
    to generate the UI for that modification.
    - dataModelNames is a list of variable names in the Mapshed data model
    (received from the backend) which should be displayed to the user.
    - validateDataModel is a function which validates the values of the
    dataModel which can be used to tell if the BMP is valid for an AOI
    - userInputNames is a list of non-Mapshed variables used to reference values
    the user enters into the UI. currently all the BMPs only reference a single
    user input variable, so using a list is overkill, but it could be useful in
    the future.
    - validate is a function which validates the user input using values from
    the data model.
    - computeOutput is a function which computes the output of the UI for a BMP,
    the values for a set of Mapshed variables.
*/
var configs = {
    'cover_crops': makeAgBmpConfig(n25Name),
    'conservation_tillage': makeAgBmpConfig(n26Name),
    'nutrient_management':  makeAgBmpConfig(n28bName),
    'waste_management_livestock': makeAeuBmpConfig(n41bName),
    'waste_management_poultry': makeAeuBmpConfig(n41dName),
    'buffer_strips': makeRuralStreamsBmpConfig(n43Name),
    'streambank_fencing': makeRuralStreamsBmpConfig(n45Name),
    'streambank_stabilization': makeRuralStreamsBmpConfig(n46cName),
    'urban_buffer_strips': makeUrbanStreamsBmpConfig(function(inputVal, fractionVal) {
        return fromPairs([
            [PctStrmBufName, fractionVal],
            [FilterWidthName, FilterWidthDefault]
        ]);
    }),
    'urban_streambank_stabilization': makeUrbanStreamsBmpConfig(function(inputVal) {
        return fromPairs([[UrbBankStabName, inputVal]]);
    }),
    'water_retention': makeUrbanAreaBmpConfig(function(inputVal, fractionVal) {
        return fromPairs([
            [n25bName, fractionVal],
            [n25cName, fractionVal]
        ]);
    }),
    'infiltration': makeUrbanAreaBmpConfig(function(inputVal, fractionVal) {
        return fromPairs([
            [PctAreaInfilName, fractionVal],
            [QretentionName, QretentionDefault]
        ]);
    })
};

module.exports = {
    displayNames: displayNames,
    isValid: isValid,
    aggregateOutput: aggregateOutput,
    configs: configs
};

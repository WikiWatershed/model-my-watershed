'use strict';

var mmwSplashPageText = {
    heading: 'Explore Human Impacts on Your Watershed',
    subheading: 'Analyze mapped watershed data, visualize monitoring data, and run model simulations of human impacts on water quality.',
    drawToolOneName: 'Select Area and Analyze',
    drawToolOneDescriptions: ['Explore map layers and select your area of interest.', 'Analyze land cover, hydrologic soil groups, permitted point source discharges and other natural and human influenced features.'],
    drawToolTwoName: 'Monitor My WatershedⓇ',
    drawToolTwoDescriptions: ['Search for monitoring data in various data repositories.', 'Share your monitoring data to view in WikiWatershed.'],
    drawToolThreeName: 'Model My WatershedⓇ',
    drawToolThreeDescriptions: ['Run one of two models to compare impacts of different conservation and development scenarios on water quality.', 'Share your modeling results for others to find, copy, and edit.'],
    getStartedButtonTitle: 'Get started',
};

var bigCZSplashPageText = {
    heading: 'Discover, Visualize, and Access Data Integrated Across Bio- & Geo- Science of the Critical Zone',
    subheading: 'Discover and visualize datasets from diverse earth surface science disciplines and repositories.',
    drawToolOneName: 'Select Area',
    drawToolOneDescriptions: ['Explore map layers and select an area of interest.'],
    drawToolTwoName: 'Analyze',
    drawToolTwoDescriptions: ['See land cover, soil groups, and climate statistics.'],
    drawToolThreeName: 'Search Data',
    drawToolThreeDescriptions: ['Search three catalogs with free text, area of interest, and other filters:'],
    getStartedButtonTitle: 'Get started',
    bigCZLinkTitle: 'Go to BigCZ.org for more info',
    bigCZLink: 'https://bigcz.org/',
};

var mmwSelectAreaText = {
    headerDescription: 'Explore mapped layers, such as streams, land cover, soils, boundaries and observations, using the layer selector in the lower left of the map.',
    selectAreaExplanation: '<a href="https://wikiwatershed.org/documentation/mmw-tech/#choose-area-of-interest-aoi" target="_blank" rel="noreferrer noopener">Select an Area of Interest</a> in the continental United States, using the suite of tools below, to analyze the factors that impact water in your area and to begin to model different scenarios of human impacts. Different modeling options for using these tools are described in the <a href="https://wikiwatershed.org/help/model-help/mmw-tech/#water-quantity-and-quality-models" target="_blank">technical documentation</a>.',
};

var bigCZSelectAreaText = {
    headerDescription: 'Explore mapped layers, such as streams, land cover, and boundaries, using the layer selector in the lower left of the map.',
    selectAreaExplanation: '<a href="https://wikiwatershed.org/documentation/mmw-tech/#choose-area-of-interest-aoi" target="_blank" rel="noreferrer noopener">Select an Area of Interest</a> (AoI) in the continental United States, using the suite of tools below, to analyze the mapped layers within your area and to initiate a search for datasets and visualize time series data. Currently the <strong>AoI must be smaller than 1,500 km<sup>2</sup></strong>.',
};

module.exports = {
    mmwSplashPageText: mmwSplashPageText,
    bigCZSplashPageText: bigCZSplashPageText,
    mmwSelectAreaText: mmwSelectAreaText,
    bigCZSelectAreaText: bigCZSelectAreaText,
};

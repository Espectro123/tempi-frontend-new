// script.js

// Get references to DOM elements
const initialTempInput = document.getElementById('initial-temp');
const finalTempInput = document.getElementById('final-temp');
const cycleDurationInput = document.getElementById('cycle-duration');
const offsetInput = document.getElementById('offset');
const startButton = document.getElementById('start-experiment');
const predictButton = document.getElementById('predict-experiment');
const xRangeInput = document.getElementById('x-range');
const yMinRangeInput = document.getElementById('y-min-range');
const yMaxRangeInput = document.getElementById('y-max-range');
const updateRangeButton = document.getElementById('update-range');
const currentTimeDisplay = document.getElementById('current-time');
const currentTempDisplay = document.getElementById('current-temp');
const messageArea = document.getElementById('message-area');
const ctx = document.getElementById('temperature-chart').getContext('2d');

// Variables for experiment control
let experimentInterval;
let experimentData = []; // Array for mean temperature data
let theoreticalData = [];
let experimentStartTime = null;
let experimentStarted = false;
let offsetTimeout;

// Arrays for each sensor's data
let sensorData = {
    sensor1: [],
    sensor2: [],
    sensor3: [],
    sensor4: [],
    sensor5: [],
    sensor6: [],
};

// Sensor Charts Initialization
let sensorChartsInitialized = false;
let sensorCharts = [];

// Predicted experiment start time
let predictedExperimentStartTime = null;

// Get the current time and initialize chart ranges
const xRange = parseFloat(xRangeInput.value) || 1; // Default to 1 hour
const halfRange = xRange * 3600000 / 2;
const now = new Date();
const xMin = now.getTime() - halfRange;
const xMax = now.getTime() + halfRange;

// Initialize main temperature chart
let temperatureChart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [
            {
                label: 'Mean Measured Temperature',
                data: experimentData,
                borderColor: 'red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                fill: false,
                tension: 0.1,
                pointRadius: 3,
            },
            {
                label: 'Theoretical Temperature',
                data: theoreticalData,
                borderColor: 'blue',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                borderDash: [5, 5],
                fill: false,
                tension: 0.1,
                pointRadius: 0,
            },
        ],
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    tooltipFormat: 'HH:mm:ss',
                    displayFormats: {
                        minute: 'HH:mm',
                    },
                },
                title: {
                    display: true,
                    text: 'Time',
                },
                min: xMin,
                max: xMax,
            },
            y: {
                min: parseFloat(yMinRangeInput.value) || 0,
                max: parseFloat(yMaxRangeInput.value) || 35,
                title: {
                    display: true,
                    text: 'Temperature (ºC)',
                },
            },
        },
        plugins: {
            legend: {
                display: true,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x',
                    modifierKey: null,
                    onPanComplete({ chart }) {
                        handleZoomPan(chart);
                    },
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true,
                    },
                    mode: 'x',
                    onZoomComplete({ chart }) {
                        handleZoomPan(chart);
                    },
                },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
    },
});

// Function to handle zoom and pan events
function handleZoomPan(chart) {
    // Get the new x-axis range after zoom/pan
    const xScale = chart.scales.x;
    const xMin = xScale.min;
    const xMax = xScale.max;

    // Update the theoretical data for the new range
    recalculateTheoreticalDataForRange(xMin, xMax);

    // Update the chart
    chart.update();
}

// Predict Experiment
predictButton.addEventListener('click', () => {
    // Validate inputs
    initialTemp = parseFloat(initialTempInput.value);
    finalTemp = parseFloat(finalTempInput.value);
    cycleDuration = parseFloat(cycleDurationInput.value);
    const offset = parseFloat(offsetInput.value);

    if (
        isNaN(initialTemp) || isNaN(finalTemp) || isNaN(cycleDuration) || isNaN(offset) ||
        initialTemp < 0 || initialTemp > 35 ||
        finalTemp < 0 || finalTemp > 35 ||
        cycleDuration <= 0 || offset < 0
    ) {
        messageArea.textContent = 'Please enter valid experiment parameters.';
        return;
    }

    // Reset experiment status
    experimentStarted = false;
    experimentStartTime = null;

    messageArea.textContent = 'Experiment predicted.';

    // Calculate predicted experiment start time
    const now = new Date();
    predictedExperimentStartTime = new Date(now.getTime() + offset * 60000);

    // Update X-axis range to center on predicted experiment start time
    const xRange = parseFloat(xRangeInput.value) || 1;
    const halfRange = xRange * 3600000 / 2;
    const xMin = predictedExperimentStartTime.getTime() - halfRange;
    const xMax = predictedExperimentStartTime.getTime() + halfRange;
    temperatureChart.options.scales.x.min = xMin;
    temperatureChart.options.scales.x.max = xMax;

    // Recalculate theoretical data for the new X-axis range
    recalculateTheoreticalDataForRange(xMin, xMax);

    temperatureChart.update();
});

// Start Experiment
startButton.addEventListener('click', () => {
    // Validate inputs
    initialTemp = parseFloat(initialTempInput.value);
    finalTemp = parseFloat(finalTempInput.value);
    cycleDuration = parseFloat(cycleDurationInput.value);
    const offset = parseFloat(offsetInput.value);

    if (
        isNaN(initialTemp) || isNaN(finalTemp) || isNaN(cycleDuration) || isNaN(offset) ||
        initialTemp < 0 || initialTemp > 35 ||
        finalTemp < 0 || finalTemp > 35 ||
        cycleDuration <= 0 || offset < 0
    ) {
        messageArea.textContent = 'Please enter valid experiment parameters.';
        return;
    }

    if (experimentInterval || offsetTimeout) {
        messageArea.textContent = 'An experiment is already running. Please refresh the page to start a new one.';
        return;
    }

    messageArea.textContent = 'Experiment will start in ' + offset + ' minute(s).';

    // Clear previous data
    clearExperimentData();

    // Set start time after offset
    offsetTimeout = setTimeout(() => {
        experimentStartTime = new Date();
        experimentStarted = true;
        predictedExperimentStartTime = null; // Clear predicted start time
        messageArea.textContent = 'Experiment started.';

        // Update X-axis range to center on experiment start time
        const xRange = parseFloat(xRangeInput.value) || 1;
        const halfRange = xRange * 3600000 / 2;
        const xMin = experimentStartTime.getTime() - halfRange;
        const xMax = experimentStartTime.getTime() + halfRange;
        temperatureChart.options.scales.x.min = xMin;
        temperatureChart.options.scales.x.max = xMax;

        // Recalculate theoretical data
        recalculateTheoreticalDataForRange(xMin, xMax);
        temperatureChart.update();

        // Start data collection
        startDataCollection();
    }, offset * 60000); // Convert minutes to milliseconds
});

// Update Axis Range
updateRangeButton.addEventListener('click', () => {
    const xRange = parseFloat(xRangeInput.value);
    const yMinRange = parseFloat(yMinRangeInput.value);
    const yMaxRange = parseFloat(yMaxRangeInput.value);

    if (
        isNaN(xRange) || isNaN(yMinRange) || isNaN(yMaxRange) ||
        xRange < 1 || xRange > 168 ||
        yMinRange < 0 || yMinRange > 35 ||
        yMaxRange < 0 || yMaxRange > 35 ||
        yMinRange >= yMaxRange
    ) {
        messageArea.textContent = 'Please enter valid axis ranges.';
        return;
    }

    // Update Y-axis range
    temperatureChart.options.scales.y.min = yMinRange;
    temperatureChart.options.scales.y.max = yMaxRange;

    // Update X-axis range to center around current time
    const now = new Date();
    const halfRange = xRange * 3600000 / 2;
    const xMin = now.getTime() - halfRange;
    const xMax = now.getTime() + halfRange;
    temperatureChart.options.scales.x.min = xMin;
    temperatureChart.options.scales.x.max = xMax;

    // Recalculate theoretical data for the new X-axis range
    recalculateTheoreticalDataForRange(xMin, xMax);

    temperatureChart.update();

    // Update sensor charts Y-axis and X-axis ranges
    if (sensorChartsInitialized) {
        for (let i = 0; i < sensorCharts.length; i++) {
            sensorCharts[i].options.scales.y.min = yMinRange;
            sensorCharts[i].options.scales.y.max = yMaxRange;
            sensorCharts[i].options.scales.x.min = xMin;
            sensorCharts[i].options.scales.x.max = xMax;
            sensorCharts[i].update();
        }
    }
});

// Function to start data collection
function startDataCollection() {
    // Collect data every minute
    experimentInterval = setInterval(() => {
        collectDataPoint();
    }, 60000); // 60000 milliseconds = 1 minute

    // Collect the first data point immediately
    collectDataPoint();
}

// Function to collect a data point
function collectDataPoint() {
    const currentTime = new Date();
    const elapsedTime = (currentTime - experimentStartTime) / 60000; // in minutes

    // Simulate measured temperature for each sensor (add some random noise)
    const theoreticalTemp = getTheoreticalTemp(elapsedTime);

    // Generate readings for each sensor
    let sensorReadings = [];
    for (let i = 1; i <= 6; i++) {
        const sensorTemp = theoreticalTemp + (Math.random() * 0.5 - 0.25); // Random noise between -0.25 and +0.25
        sensorReadings.push(sensorTemp);

        // Add data to the corresponding sensor's data array
        sensorData[`sensor${i}`].push({ x: currentTime, y: sensorTemp });
    }

    // Calculate the mean temperature
    const meanTemp = sensorReadings.reduce((sum, temp) => sum + temp, 0) / sensorReadings.length;

    // Update experimentData with the mean temperature
    experimentData.push({ x: currentTime, y: meanTemp });

    // Update current readings
    currentTimeDisplay.textContent = currentTime.toLocaleTimeString();
    currentTempDisplay.textContent = meanTemp.toFixed(2) + ' ºC';

    // Update X-axis range to center around current time
    const xRange = parseFloat(xRangeInput.value) || 1;
    const halfRange = xRange * 3600000 / 2;
    const xMin = currentTime.getTime() - halfRange;
    const xMax = currentTime.getTime() + halfRange;

    temperatureChart.options.scales.x.min = xMin;
    temperatureChart.options.scales.x.max = xMax;

    // Remove old data points outside the X-axis range
    experimentData = experimentData.filter(point => point.x.getTime() >= xMin);
    for (let i = 1; i <= 6; i++) {
        sensorData[`sensor${i}`] = sensorData[`sensor${i}`].filter(point => point.x.getTime() >= xMin);
    }

    // Update chart datasets
    temperatureChart.data.datasets[0].data = experimentData;

    // Recalculate theoretical data
    recalculateTheoreticalDataForRange(xMin, xMax);

    temperatureChart.update();

    // Update sensor charts if they are initialized
    if (sensorChartsInitialized) {
        for (let i = 0; i < sensorCharts.length; i++) {
            const sensorNumber = i + 1;
            sensorCharts[i].data.datasets[0].data = sensorData[`sensor${sensorNumber}`];

            // Update X-axis range
            sensorCharts[i].options.scales.x.min = xMin;
            sensorCharts[i].options.scales.x.max = xMax;

            sensorCharts[i].update();
        }
    }
}

// Function to calculate theoretical temperature
function getTheoreticalTemp(elapsedTime) {
    // Temperature varies sinusoidally between initialTemp and finalTemp over the cycle duration
    const amplitude = (finalTemp - initialTemp) / 2;
    const midpoint = (finalTemp + initialTemp) / 2;
    const cyclePosition = (elapsedTime % cycleDuration) / cycleDuration; // Fraction of the cycle
    const temp = amplitude * Math.sin(2 * Math.PI * cyclePosition) + midpoint;
    return temp;
}

// Function to recalculate theoretical data across a given X-axis range
function recalculateTheoreticalDataForRange(xMin, xMax) {
    if (isNaN(initialTemp) || isNaN(finalTemp) || isNaN(cycleDuration)) {
        // Parameters are not set
        theoreticalData.length = 0;
        return;
    }

    // Determine the start time for theoretical data
    let startTimeMs;
    if (experimentStarted && experimentStartTime) {
        // Theoretical data starts from experiment start time or xMin, whichever is greater
        startTimeMs = Math.max(experimentStartTime.getTime(), xMin);
    } else if (predictedExperimentStartTime) {
        // Use predicted experiment start time
        startTimeMs = Math.max(predictedExperimentStartTime.getTime(), xMin);
    } else {
        // No start time; do not display theoretical data
        theoreticalData.length = 0;
        return;
    }

    // Clear existing theoretical data
    theoreticalData.length = 0;

    // Calculate the number of data points (e.g., one per minute)
    const interval = 60000; // 1 minute in milliseconds
    for (let time = startTimeMs; time <= xMax; time += interval) {
        const currentTime = new Date(time);
        let elapsedTime;
        if (experimentStarted && experimentStartTime) {
            elapsedTime = (currentTime - experimentStartTime) / 60000; // in minutes
        } else {
            // For prediction, elapsed time is from the predicted experiment start time
            elapsedTime = (currentTime - predictedExperimentStartTime.getTime()) / 60000; // in minutes
        }
        const theoreticalTemp = getTheoreticalTemp(elapsedTime);
        theoreticalData.push({ x: currentTime, y: theoreticalTemp });
    }
}

// Function to clear experiment data
function clearExperimentData() {
    experimentData.length = 0;
    theoreticalData.length = 0;

    // Clear sensor data
    for (let i = 1; i <= 6; i++) {
        sensorData[`sensor${i}`].length = 0;
    }

    // Reset experiment status
    experimentStarted = false;
    experimentStartTime = null;
    predictedExperimentStartTime = null;
    clearTimeout(offsetTimeout);
    experimentInterval = null;
    offsetTimeout = null;

    // Reset X-axis range
    const xRange = parseFloat(xRangeInput.value) || 1;
    const halfRange = xRange * 3600000 / 2;
    const now = new Date();
    const xMin = now.getTime() - halfRange;
    const xMax = now.getTime() + halfRange;

    temperatureChart.options.scales.x.min = xMin;
    temperatureChart.options.scales.x.max = xMax;

    // Recalculate theoretical data
    recalculateTheoreticalDataForRange(xMin, xMax);

    temperatureChart.update();

    // Reset sensor charts if they are initialized
    if (sensorChartsInitialized) {
        for (let i = 0; i < sensorCharts.length; i++) {
            sensorCharts[i].data.datasets[0].data = [];
            sensorCharts[i].options.scales.x.min = xMin;
            sensorCharts[i].options.scales.x.max = xMax;
            sensorCharts[i].update();
        }
    }
}

// Update current time every second
setInterval(() => {
    const now = new Date();
    currentTimeDisplay.textContent = now.toLocaleTimeString();
}, 1000);

// Navigation Elements
const navExperiment = document.getElementById('nav-experiment');
const navSensors = document.getElementById('nav-sensors');
const navHelp = document.getElementById('nav-help');

// Content Sections
const experimentSection = document.getElementById('experiment-section');
const sensorsSection = document.getElementById('sensors-section');
const helpSection = document.getElementById('help-section');

// Function to switch between sections
function showSection(section) {
    // Hide all sections
    experimentSection.style.display = 'none';
    sensorsSection.style.display = 'none';
    helpSection.style.display = 'none';

    // Remove active class from all nav links
    navExperiment.classList.remove('active');
    navSensors.classList.remove('active');
    navHelp.classList.remove('active');

    // Show the selected section and set active nav link
    switch (section) {
        case 'experiment':
            experimentSection.style.display = 'block';
            navExperiment.classList.add('active');
            break;
        case 'sensors':
            sensorsSection.style.display = 'block';
            navSensors.classList.add('active');
            initializeSensorCharts();
            break;
        case 'help':
            helpSection.style.display = 'block';
            navHelp.classList.add('active');
            break;
    }
}

// Event Listeners for Navigation
navExperiment.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('experiment');
});

navSensors.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('sensors');
});

navHelp.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('help');
});

// Function to initialize sensor charts
function initializeSensorCharts() {
    if (sensorChartsInitialized) return;

    const now = new Date();
    const xRange = parseFloat(xRangeInput.value) || 1;
    const halfRange = xRange * 3600000 / 2;
    const xMin = now.getTime() - halfRange;
    const xMax = now.getTime() + halfRange;

    for (let i = 1; i <= 6; i++) {
        const ctx = document.getElementById(`sensor-chart-${i}`).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: `Sensor ${i} Temperature`,
                        data: sensorData[`sensor${i}`],
                        borderColor: 'green',
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 3,
                        pointBackgroundColor: 'green',
                        pointBorderColor: 'white',
                        pointBorderWidth: 1,
                        pointStyle: 'circle',
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'HH:mm:ss',
                            displayFormats: {
                                minute: 'HH:mm',
                            },
                        },
                        title: {
                            display: true,
                            text: 'Time',
                        },
                        min: xMin,
                        max: xMax,
                    },
                    y: {
                        min: temperatureChart.options.scales.y.min,
                        max: temperatureChart.options.scales.y.max,
                        title: {
                            display: true,
                            text: 'Temperature (ºC)',
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        });

        sensorCharts.push(chart);
    }

    sensorChartsInitialized = true;
}

// Show the experiment section by default
showSection('experiment');

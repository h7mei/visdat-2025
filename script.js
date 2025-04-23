// Set up dimensions and margins for all charts
const margin = { top: 50, right: 30, bottom: 70, left: 100 };

// Function to get container dimensions
function getContainerDimensions(containerId) {
    const container = document.getElementById(containerId);
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    return { width, height };
}

// Create SVG containers for each chart
const barChartSvg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const scatterPlotSvg = d3.select("#scatter-plot")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const pieChartSvg = d3.select("#pie-chart")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", d => {
        const { width, height } = getContainerDimensions("pie-chart");
        return `translate(${(width + margin.left + margin.right) / 2},${(height + margin.top + margin.bottom) / 2})`;
    });

// Create tooltip
const tooltip = d3.select(".tooltip");

// Color scale for genres
const color = d3.scaleOrdinal()
    .domain(["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History", "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"])
    .range(d3.schemeTableau10);

// Make data accessible globally
let globalData;

// Load and process data
d3.csv("sample.csv").then(data => {
    // Store data globally
    globalData = data;
    
    // Process data
    data.forEach(d => {
        d.rank = +d.rank;
        d.averageRating = +d.averageRating;
        d.startYear = +d.startYear;
        d.runtimeMinutes = +d.runtimeMinutes;
        d.numVotes = +d.numVotes;
        d.genres = d.genres.split(", ");
    });

    // Get unique genres
    const genres = [...new Set(data.flatMap(d => d.genres))];
    
    // Populate genre filter
    const genreFilter = d3.select("#genre-filter");
    genres.forEach(genre => {
        genreFilter.append("option")
            .attr("value", genre)
            .text(genre);
    });

    // Initial visualization
    updateVisualizations(data);

    // Add event listeners
    d3.select("#genre-filter").on("change", function() {
        const selectedGenre = this.value;
        const filteredData = selectedGenre === "all" 
            ? data 
            : data.filter(d => d.genres.includes(selectedGenre));
        updateVisualizations(filteredData);
    });

    d3.select("#sort-by").on("change", function() {
        const sortBy = this.value;
        const sortedData = [...data].sort((a, b) => {
            if (sortBy === "rank") return a.rank - b.rank;
            if (sortBy === "rating") return b.averageRating - a.averageRating;
            if (sortBy === "year") return b.startYear - a.startYear;
        });
        updateVisualizations(sortedData);
    });

    // Hide loading screen after data is loaded
    hideLoadingScreen();
});

function updateVisualizations(data) {
    updateBarChart(data);
    updateScatterPlot(data);
    updatePieChart(data);
}

// Function to calculate dynamic height based on data
function calculateBarChartHeight(data) {
    const fixedBarHeight = 10; 
    const barSpacing = 9;
    const padding = 50;
    
    if (data.length > 300) {
        return 2000;
    }

    return (data.length * (fixedBarHeight + barSpacing)) + padding;
}

// Update the bar chart visualization
function updateBarChart(data) {
    // Clear previous visualization
    barChartSvg.selectAll("*").remove();

    const { width, height } = getContainerDimensions("bar-chart");
    const chartHeight = 500; // Fixed height for line chart

    // Update SVG height
    d3.select("#bar-chart svg")
        .attr("height", chartHeight);

    // Group data by year and calculate average rating
    const yearData = d3.rollup(
        data,
        v => d3.mean(v, d => d.averageRating),
        d => d.startYear
    );

    const yearDataArray = Array.from(yearData, ([year, avgRating]) => ({
        year: +year,
        avgRating
    })).sort((a, b) => a.year - b.year);

    // Create scales
    const x = d3.scaleLinear()
        .domain([d3.min(yearDataArray, d => d.year), d3.max(yearDataArray, d => d.year)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(yearDataArray, d => d.avgRating)])
        .range([chartHeight - margin.top - margin.bottom, 0]);

    // Add grid
    barChartSvg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    barChartSvg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${chartHeight - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x)
            .tickSize(-(chartHeight - margin.top - margin.bottom))
            .tickFormat("")
        );

    // Add axes
    barChartSvg.append("g")
        .attr("transform", `translate(0,${chartHeight - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x));

    barChartSvg.append("g")
        .call(d3.axisLeft(y));

    // Add axis labels
    barChartSvg.append("text")
        .attr("transform", `translate(${width/2}, ${chartHeight - margin.top - margin.bottom + 40})`)
        .style("text-anchor", "middle")
        .text("Year");

    barChartSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 40)
        .attr("x", 0 - (chartHeight - margin.top - margin.bottom) / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Average Rating");

    // Create line generator
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.avgRating))
        .curve(d3.curveMonotoneX);

    // Add the line
    barChartSvg.append("path")
        .datum(yearDataArray)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add dots
    barChartSvg.selectAll(".dot")
        .data(yearDataArray)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.avgRating))
        .attr("r", 4)
        .attr("fill", "#2196F3")
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
}

function updateScatterPlot(data) {
    // Clear previous visualization
    scatterPlotSvg.selectAll("*").remove();

    const { width, height } = getContainerDimensions("scatter-plot");

    // Create scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.runtimeMinutes)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.numVotes)])
        .range([height, 0]);

    // Add axes
    scatterPlotSvg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    scatterPlotSvg.append("g")
        .call(d3.axisLeft(y));

    // Add grid
    scatterPlotSvg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    scatterPlotSvg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickSize(-height)
            .tickFormat("")
        );

    // Add axis labels
    scatterPlotSvg.append("text")
        .attr("transform", `translate(${width/2}, ${height + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .text("Durasi Film (menit)");

    scatterPlotSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 40)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Jumlah Pemilih");

    // Add dots
    scatterPlotSvg.selectAll(".scatter-dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "scatter-dot")
        .attr("cx", d => x(d.runtimeMinutes))
        .attr("cy", d => y(d.numVotes))
        .attr("r", 5)
        .attr("fill", "#2196F3")
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
}

function updatePieChart(data) {
    // Clear previous visualization
    pieChartSvg.selectAll("*").remove();

    const { width, height } = getContainerDimensions("pie-chart");

    // Calculate genre counts
    const genreCounts = {};
    data.forEach(movie => {
        movie.genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
    });

    // Convert to array for pie chart
    const genreData = Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        count
    }));

    // Create pie layout
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    // Create arc generator
    const radius = Math.min(width, height) / 2 - 50;
    const arc = d3.arc()
        .innerRadius(radius * 0.5) // Make it a donut chart
        .outerRadius(radius);

    // Create pie chart
    const arcs = pieChartSvg.selectAll(".arc")
        .data(pie(genreData))
        .enter()
        .append("g")
        .attr("class", "arc");

    // Add slices
    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.genre))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>${d.data.genre}</strong><br>
                    Jumlah Film: ${d.data.count}<br>
                    Persentase: ${((d.data.count / data.length) * 100).toFixed(1)}%
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", d3.arc()
                    .innerRadius(radius * 0.5)
                    .outerRadius(radius + 10)
                );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", arc);
        });

    // Add labels
    arcs.append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "white")
        .text(d => d.data.count > 2 ? d.data.genre : "");

    // Add legend
    const legend = pieChartSvg.append("g")
        .attr("transform", `translate(${radius + 20}, -${height/2})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(genreData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => color(d.genre));

    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "12px")
        .text(d => `${d.genre} (${d.count})`);
}

function showTooltip(event, d) {
    tooltip.style("display", "block")
        .html(`
            <strong>${d.year}</strong><br>
            Average Rating: ${d.avgRating.toFixed(2)}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function moveTooltip(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
    tooltip.style("display", "none");
}

// Add window resize handler
window.addEventListener('resize', () => {
    if (globalData) {
        updateVisualizations(globalData);
    }
}); 
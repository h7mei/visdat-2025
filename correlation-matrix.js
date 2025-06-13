export function createCorrelationMatrix(data) {
  // Clear previous visualization
  d3.select("#correlation-matrix svg").remove();

  const margin = { top: 80, right: 80, bottom: 80, left: 80 }; // Increased margins
  const width = 400; // Increased width
  const height = 400; // Increased height

  // Get container dimensions
  const container = document.getElementById("correlation-matrix");
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Calculate scaling factor to fit the chart
  const scale = Math.min(
    (containerWidth - margin.left - margin.right) / width,
    (containerHeight - margin.top - margin.bottom) / height
  );

  // Calculate centering offsets
  const xOffset = (containerWidth - (width * scale + margin.left + margin.right)) / 2;
  const yOffset = (containerHeight - (height * scale + margin.top + margin.bottom)) / 2;

  // Create SVG
  const svg = d3
    .select("#correlation-matrix")
    .append("svg")
    .attr("width", width * scale + margin.left + margin.right)
    .attr("height", height * scale + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left + xOffset},${margin.top + yOffset}) scale(${scale})`);

  // Features to analyze with Indonesian labels
  const features = ["averageRating", "numVotes", "runtimeMinutes", "startYear"];
  const featureLabels = {
    averageRating: "Rating Rata-rata",
    numVotes: "Jumlah Suara",
    runtimeMinutes: "Durasi (Menit)",
    startYear: "Tahun Rilis",
  };

  // Calculate correlation matrix
  const correlationMatrix = [];
  for (let i = 0; i < features.length; i++) {
    correlationMatrix[i] = [];
    for (let j = 0; j < features.length; j++) {
      const xi = data.map((row) => {
        const val = Number(row[features[i]]);
        return isNaN(val) ? 0 : val;
      });
      const yj = data.map((row) => {
        const val = Number(row[features[j]]);
        return isNaN(val) ? 0 : val;
      });
      correlationMatrix[i][j] = pearsonCorrelation(xi, yj);
    }
  }

  // Create scales
  const xScale = d3.scaleBand().domain(features).range([0, width]);

  const yScale = d3.scaleBand().domain(features).range([0, height]);

  const colorScale = d3.scaleSequential().domain([-1, 1]).interpolator(d3.interpolateRdYlBu);

  // Add correlation cells
  svg
    .selectAll()
    .data(correlationMatrix.flat())
    .enter()
    .append("rect")
    .attr("x", (d, i) => xScale(features[i % features.length]))
    .attr("y", (d, i) => yScale(features[Math.floor(i / features.length)]))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .append("title")
    .text((d) => d.toFixed(2));

  // Add horizontal feature labels (bottom)
  svg
    .selectAll(".x-label")
    .data(features)
    .enter()
    .append("text")
    .attr("class", "x-label")
    .attr("x", (d) => xScale(d) + xScale.bandwidth() / 2)
    .attr("y", height + 35)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text((d) => featureLabels[d]);

  // Add vertical feature labels (left)
  svg
    .selectAll(".y-label")
    .data(features)
    .enter()
    .append("text")
    .attr("class", "y-label")
    .attr("x", -35)
    .attr("y", (d) => yScale(d) + yScale.bandwidth() / 2)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("font-size", "12px")
    .attr("transform", (d) => `rotate(-90, ${-35}, ${yScale(d) + yScale.bandwidth() / 2})`)
    .text((d) => featureLabels[d]);

  // Add correlation values
  svg
    .selectAll()
    .data(correlationMatrix.flat())
    .enter()
    .append("text")
    .attr("x", (d, i) => xScale(features[i % features.length]) + xScale.bandwidth() / 2)
    .attr("y", (d, i) => yScale(features[Math.floor(i / features.length)]) + yScale.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", "12px")
    .attr("fill", (d) => (Math.abs(d) > 0.5 ? "white" : "black"))
    .text((d) => d.toFixed(2));
}

// Pearson correlation function
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) return 0;
  return numerator / Math.sqrt(denomX * denomY);
}

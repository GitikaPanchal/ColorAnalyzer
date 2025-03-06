importScripts("color.js");

self.onmessage = async function (e) {
  if (e.data.type === "analyze") {
    const imageData = e.data.imageData;
    const numColors = e.data.numColors || 8;

    try {
      // Use the extracted imageData directly
      const result = await processImageData(imageData, numColors);
      self.postMessage({ type: "result", data: result });
    } catch (error) {
      self.postMessage({ type: "error", error: error.message });
    }
  }
};

// Process image data from ImageData object
async function processImageData(imageData, numColors) {
  // Extract pixel data from ImageData
  const pixels = imageData.data;
  const pixelArray = [];

  // Convert to array of RGB values
  for (let i = 0; i < pixels.length; i += 4) {
    pixelArray.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }

  // Perform k-means clustering
  const { centroids, labels } = kmeans(pixelArray, numColors);

  // Count occurrences of each cluster
  const counts = new Array(numColors).fill(0);
  labels.forEach((label) => counts[label]++);

  // Sort clusters by frequency
  const sortedIndices = Array.from({ length: counts.length }, (_, i) => i).sort(
    (a, b) => counts[b] - counts[a]
  );

  // Prepare results
  const results = sortedIndices.map((idx, i) => {
    const color = centroids[idx].map(Math.round);
    const hexColor = `#${color[0].toString(16).padStart(2, "0")}${color[1]
      .toString(16)
      .padStart(2, "0")}${color[2].toString(16).padStart(2, "0")}`;
    const percentage = (counts[idx] / labels.length) * 100;

    return {
      rank: i + 1,
      hex: hexColor,
      rgb: color,
      percentage: percentage,
    };
  });

  // Get dominant color info
  const dominantColor = results[0].hex;
  const textColor = getTextColor(dominantColor);

  return {
    dominantColor,
    textColor,
    allColors: results,
  };
}

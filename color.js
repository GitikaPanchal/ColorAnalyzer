// Function to extract dominant colors from an image using k-means clustering
async function extractDominantColors(imageSrc, numColors = 18) {
  // Create a canvas to load and process the image
  const img = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Load the image
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = imageSrc;
  });

  // Set canvas dimensions to match image
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw image on canvas
  ctx.drawImage(img, 0, 0);

  // Get image data (RGBA values for each pixel)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Prepare data for clustering (convert to array of RGB values)
  const pixelArray = [];
  for (let i = 0; i < pixels.length; i += 4) {
    pixelArray.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }

  // Perform k-means clustering
  const { centroids, labels } = kmeans(pixelArray, numColors);

  // Count occurrences of each cluster
  const counts = new Array(numColors).fill(0);
  labels.forEach((label) => counts[label]++);

  // Sort clusters by frequency (most common first)
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

  return results;
}

// Simple k-means implementation
function kmeans(data, k, maxIterations = 50) {
  // Initialize centroids randomly
  let centroids = [];
  for (let i = 0; i < k; i++) {
    centroids.push(data[Math.floor(Math.random() * data.length)]);
  }

  let labels = new Array(data.length);
  let iterations = 0;
  let oldCentroids = null;

  while (iterations < maxIterations) {
    // Assign points to nearest centroid
    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let label = -1;

      for (let j = 0; j < centroids.length; j++) {
        const dist = euclideanDistance(data[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          label = j;
        }
      }

      labels[i] = label;
    }

    // Store old centroids for convergence check
    oldCentroids = [...centroids];

    // Recalculate centroids
    centroids = new Array(k).fill().map(() => [0, 0, 0]);
    const counts = new Array(k).fill(0);

    for (let i = 0; i < data.length; i++) {
      const label = labels[i];
      counts[label]++;

      for (let j = 0; j < data[i].length; j++) {
        centroids[label][j] += data[i][j];
      }
    }

    for (let i = 0; i < k; i++) {
      if (counts[i] !== 0) {
        for (let j = 0; j < centroids[i].length; j++) {
          centroids[i][j] /= counts[i];
        }
      }
    }

    // Check convergence
    if (arraysEqual(centroids, oldCentroids)) {
      break;
    }

    iterations++;
  }

  return { centroids, labels };
}

// Helper function to calculate Euclidean distance
function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Helper function to check if arrays are equal
function arraysEqual(a, b) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      if (Math.abs(a[i][j] - b[i][j]) > 0.001) {
        return false;
      }
    }
  }
  return true;
}

// Function to determine if text should be black or white on a given background
function getTextColor(hexColor) {
  // Remove the '#' if present
  hexColor = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);

  // Calculate luminance using the perceived brightness formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return appropriate text color
  return luminance > 0.5 ? "black" : "white";
}

// Usage example
async function analyzeImage(imagePath) {
  const example = "Test Text";

  try {
    console.log("Analyzing image colors...");
    const colors = await extractDominantColors(imagePath);

    // Display dominant colors
    console.log("Dominant colors (hex):");
    colors.forEach((color) => {
      console.log(
        `${color.rank}. ${color.hex} - ${color.percentage.toFixed(2)}%`
      );
    });

    // Get the most dominant color
    const dominantColor = colors[0].hex;
    const textColor = getTextColor(dominantColor);

    console.log(`\nDominant color: ${dominantColor}`);
    console.log(
      `Text '${example}' should be ${textColor} on this background for best readability`
    );

    return {
      dominantColor,
      textColor,
      allColors: colors,
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
  }
}

// Example usage in browser
// analyzeImage('path/to/your/image.jpg');

// For Node.js, you would need to use a library like canvas to process images

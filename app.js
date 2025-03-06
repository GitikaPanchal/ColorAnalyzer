let colorWorker;

document.addEventListener("DOMContentLoaded", () => {
  const imageUpload = document.getElementById("imageUpload");
  const preview = document.getElementById("preview");
  const fileName = document.getElementById("fileName");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const progressBar = document.getElementById("progressBar");
  const colorResults = document.getElementById("colorResults");
  const colorPalette = document.getElementById("colorPalette");
  const textPreview = document.getElementById("textPreview");
  const sampleText = document.getElementById("sampleText");
  const customText = document.getElementById("customText");

  let imageUrl = null;

  // Initialize the web worker if supported
  initWorker();

  // Handle file upload
  imageUpload.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Update file name display
    fileName.textContent = file.name;

    // Create a URL for the file
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    imageUrl = URL.createObjectURL(file);

    // Display preview
    preview.src = imageUrl;
    preview.style.display = "block";

    // Show loading state
    loadingIndicator.classList.remove("hidden");
    colorResults.classList.add("hidden");

    // Initialize progress bar
    progressBar.style.width = "0%";

    // Create a more realistic progress animation
    // Fast at first, then slows down to simulate processing time
    let progress = 0;
    const fastPhase = setInterval(() => {
      progress += 3;
      if (progress >= 70) {
        clearInterval(fastPhase);

        // Slow phase - simulates processing time
        const slowPhase = setInterval(() => {
          progress += 0.5;
          if (progress >= 95) {
            clearInterval(slowPhase);
          }
          progressBar.style.width = `${progress}%`;
        }, 100);
      }
      progressBar.style.width = `${progress}%`;
    }, 30);

    // Analyze the image using worker if available, otherwise fall back to synchronous method
    if (colorWorker) {
      analyzeImageWithWorker(imageUrl, 8); // Use 8 colors instead of 18 for better performance
    } else {
      analyzeImage(imageUrl, 8)
        .then((result) => {
          if (result) {
            // Complete progress bar at 100%
            progressBar.style.width = "100%";

            // Short delay before showing results to ensure user sees 100%
            setTimeout(() => {
              // Hide loading, show results
              loadingIndicator.classList.add("hidden");
              colorResults.classList.remove("hidden");

              // Display the color palette
              displayColorPalette(result.allColors);

              // Set text preview with first dominant color
              setTextPreviewColor(result.dominantColor, result.textColor);
            }, 400);
          }
        })
        .catch((error) => {
          console.error("Error analyzing image:", error);
          progressBar.style.width = "100%";

          setTimeout(() => {
            loadingIndicator.classList.add("hidden");
            alert("Error analyzing image. Please try another image.");
          }, 300);
        });
    }
  });

  // Handle custom text input
  customText.addEventListener("input", function () {
    sampleText.textContent = this.value || "Sample Text";
  });

  // Initialize the worker
  function initWorker() {
    if (window.Worker) {
      colorWorker = new Worker("color-worker.js");

      colorWorker.onmessage = function (e) {
        if (e.data.type === "result") {
          const result = e.data.data;

          // Complete progress bar at 100%
          progressBar.style.width = "100%";

          // Short delay before showing results
          setTimeout(() => {
            loadingIndicator.classList.add("hidden");
            colorResults.classList.remove("hidden");
            displayColorPalette(result.allColors);
            setTextPreviewColor(result.dominantColor, result.textColor);
          }, 400);
        } else if (e.data.type === "error") {
          console.error("Worker error:", e.data.error);
          progressBar.style.width = "100%";
          setTimeout(() => {
            loadingIndicator.classList.add("hidden");
            alert("Error analyzing image. Please try another image.");
          }, 300);
        }
      };
    }
  }

  // Analyze image with Web Worker
  function analyzeImageWithWorker(imageSrc, numColors = 8) {
    if (colorWorker) {
      // Create a canvas to get imageData to send to worker
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Resize large images for better performance
        let width = img.width;
        let height = img.height;
        const maxDimension = 200;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);

        // Send to worker
        colorWorker.postMessage({
          type: "analyze",
          imageData: imageData,
          numColors: numColors,
        });
      };

      img.onerror = function () {
        console.error("Error loading image");
        progressBar.style.width = "100%";
        setTimeout(() => {
          loadingIndicator.classList.add("hidden");
          alert("Error loading image. Please try another image.");
        }, 300);
      };

      img.src = imageSrc;
    }
  }

  // Get resized image data for better performance
  async function getResizedImageData(imageSrc, maxDimension = 200) {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageSrc;
    });

    // Calculate new dimensions while maintaining aspect ratio
    let width = img.width;
    let height = img.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // Set canvas size and draw resized image
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    return ctx.getImageData(0, 0, width, height);
  }

  // Function to display the color palette
  function displayColorPalette(colors) {
    colorPalette.innerHTML = "";

    // Filter duplicate hex colors
    const uniqueColors = [];
    const seenHex = new Set();

    colors.forEach((color) => {
      if (!seenHex.has(color.hex)) {
        seenHex.add(color.hex);
        uniqueColors.push(color);
      }
    });

    // Limit to top 5 colors for display
    const displayColors = uniqueColors.slice(0, 5);

    displayColors.forEach((color) => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.backgroundColor = color.hex;

      // Add tooltip with color info
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = `${color.hex} (${color.percentage.toFixed(1)}%)`;
      swatch.appendChild(tooltip);

      // Make each swatch clickable to set as text preview color
      swatch.addEventListener("click", () => {
        const textColor = getTextColor(color.hex);
        setTextPreviewColor(color.hex, textColor);
      });

      colorPalette.appendChild(swatch);
    });
  }

  // Function to set the text preview color
  function setTextPreviewColor(colorHex, textColor) {
    textPreview.style.backgroundColor = colorHex;
    sampleText.style.color = textColor;
  }
});

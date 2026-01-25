interface forecastProps {
  x: number;
  known_ys: number[];
  known_xs: number[];
}

/**
 * Replicates the Excel FORECAST.LINEAR function (which is the same as the older FORECAST function).
 *
 * @param {number} x The data point for which you want to predict a value (the new x-value).
 * @param {number[]} known_ys The dependent array or range of data (known y-values).
 * @param {number[]} known_xs The independent array or range of data (known x-values).
 * @returns {number} The predicted y-value.
 */

export function forecast({ x, known_ys, known_xs }: forecastProps): number {
  let i,
    nr = 0,
    dr = 0,
    ax,
    ay,
    a,
    b;

  function average(arr: number[]) {
    console.log(arr, known_xs);
    let r = 0;
    for (i = 0; i < arr.length; i++) {
      r += arr[i];
    }
    return r / arr.length;
  }

  ax = average(known_xs);
  ay = average(known_ys);

  for (i = 0; i < known_xs.length; i++) {
    nr += (known_xs[i] - ax) * (known_ys[i] - ay);
    dr += (known_xs[i] - ax) * (known_xs[i] - ax);
  }

  b = nr / dr; // Slope
  a = ay - b * ax; // Intercept

  return a + b * x; // Predicted y-value
}

// Example usage:
// const knownY = [6, 7, 9, 15, 21];
// const knownX = [20, 28, 31, 38, 40];
// const xValueToForecast = 30;

// const predictedValue = forecast(xValueToForecast, knownY, knownX);
// console.log(predictedValue); // Output: 10.607253406072535 (matches Excel's output)

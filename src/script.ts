// @ts-ignore
import Stats from "stats-js";

import {
  BOTTOM_COLOR_A,
  BOTTOM_COLOR_B,
  TOP_COLOR_A,
  TOP_COLOR_B,
} from "./constants";

const SHOW_STATS: boolean = true;
const BAR_WIDTH: number = 3;
const X_SPACING: number = 1;
const Y_SPACING: number = 3;
let audioContext: AudioContext;
let topGradient: any;
let bottomUnplayedGradient: any;
let bottomGradient: any;
let isDrawing = false;

const canvas: HTMLCanvasElement = <HTMLCanvasElement>(
  document.getElementById("canvas")
);

const drawContext: CanvasRenderingContext2D = <CanvasRenderingContext2D>(
  canvas.getContext("2d", {
    alpha: true,
  })
);

const audio: HTMLAudioElement = <HTMLAudioElement>(
  document.getElementById("audio")
);

audio.volume = 0.2;

// function setupExperiment() {
//   audio.removeEventListener("play", setupExperiment);
//
//   /*if (SHOW_STATS) {
//     let stats = new Stats();
//     stats.domElement.style.position = "absolute";
//     stats.domElement.style.left = "0";
//     stats.domElement.style.top = "0";
//     document.body.appendChild(stats.domElement);
//     requestAnimationFrame(function updateStats() {
//       stats.update();
//       requestAnimationFrame(updateStats);
//     });
//   }*/
//
//   audioContext = new AudioContext();
//   const url = <string | URL>audio.getAttribute("src");
//   /*
//      we have to load the data separately since we can't read raw buffer data from the audio node in advance
//      if all we wanted was realtime analysis, the audio element alone would be enough
//      fetch audio - probably use fetch to do this instead of XHR
//   */
//   const request = new XMLHttpRequest();
//   request.open("GET", url, true);
//   request.responseType = "arraybuffer";
//
//   const loadStart = Date.now();
//   request.onload = function () {
//     console.log("Requesting data");
//     audioContext.decodeAudioData(request.response).then((buffer) => {
//       console.log(
//         "Request complete",
//         `Loading finished in ${(Date.now() - loadStart) / 1000}s`
//       );
//       processAudio(buffer);
//     });
//   };
//   request.send();
//   document.getElementById("message")!.textContent = "Loading…";
// }

// function processAudio(buffer: AudioBuffer) {
//   /* Analyze data */
//   console.log("Analyzing buffer");
//   document.getElementById("message")!.textContent = "Computing…";
//   const startTime = Date.now();
//
//   const outputArrayL = getLevelsFromSamples(buffer.getChannelData(0));
//   const outputArrayR =
//     buffer.numberOfChannels > 1
//       ? getLevelsFromSamples(buffer.getChannelData(1))
//       : outputArrayL;
//
//   /* done */
//   console.log(
//     "Analysis complete",
//     `Finished in ${(Date.now() - startTime) / 1000}s`
//   );
//   document.getElementById("message")!.remove();
//
//   /* get drawing ready */
//   canvas.width = (BAR_WIDTH + X_SPACING) * outputArrayL.length + X_SPACING;
//   canvas.height = Math.floor(canvas.width / 6);
//   prepareForDrawing(drawContext);
//
//   const render = drawResults(canvas, drawContext, outputArrayL, outputArrayR);
//
//   render();
//
//   /* pause/restart animation with audio pause/play */
//   const seekTrack = (evt: { target: HTMLElement }) => {
//     const progress = evt.offsetX / evt.target.offsetWidth;
//     audio.currentTime = progress * audio.duration;
//   };
//
//   const startDrawing = () => {
//     isDrawing = true;
//     window.requestAnimationFrame(render);
//   };
//
//   const stopDrawing = () => {
//     isDrawing = false;
//   };
//   canvas.addEventListener("click", seekTrack);
//   audio.addEventListener("play", startDrawing);
//   audio.addEventListener("pause", stopDrawing);
//   audio.addEventListener("seeked", render);
//
//   /* audio should have already started */
//   startDrawing();
//
//   /* TODO: maybe handle resize? */
// }

// function getLevelsFromSamples(samples: Float32Array) {
//   const OUTPUT_RESOLUTION = 300;
//   const MAX_SAMPLES_PER_CHUNK = 5000;
//
//   const samplesPerChunk = Math.min(
//     MAX_SAMPLES_PER_CHUNK,
//     samples.length / OUTPUT_RESOLUTION
//   );
//   const stride = Math.floor(
//     samples.length / OUTPUT_RESOLUTION / samplesPerChunk
//   );
//
//   const result = new Float32Array(OUTPUT_RESOLUTION);
//   for (let s = 0; s < OUTPUT_RESOLUTION; s += 1) {
//     const chunkSamples = new Float32Array(samplesPerChunk);
//     const offset = Math.floor((s * samples.length) / OUTPUT_RESOLUTION);
//
//     for (let i = 0; i < samplesPerChunk; i += 1) {
//       if (offset + i * stride < samples.length) {
//         chunkSamples[i] = samples[offset + i * stride];
//       }
//     }
//
//     // 85th PERCENTILE
//     result[s] = chunkSamples.sort()[Math.floor(0.85 * chunkSamples.length)];
//   }
//   return result;
// }

// function prepareForDrawing(ctx: CanvasRenderingContext2D) {
//   const { width, height } = canvas;
//   const topHeight = 0.7 * (height - 3 * Y_SPACING);
//   const bottomHeight = 0.3 * (height - 3 * Y_SPACING);
//
//   topGradient = ctx.createLinearGradient(
//     0,
//     Y_SPACING + topHeight,
//     0,
//     Y_SPACING
//   );
//
//   topGradient.addColorStop(0, TOP_COLOR_A);
//   topGradient.addColorStop(1, TOP_COLOR_B);
//
//   bottomUnplayedGradient = ctx.createLinearGradient(
//     0,
//     2 * Y_SPACING + topHeight,
//     0,
//     height - Y_SPACING
//   );
//
//   bottomUnplayedGradient.addColorStop(0, "rgba(255,255,255,0.4)");
//   bottomUnplayedGradient.addColorStop(1, "rgba(255,255,255,0.0)");
//
//   bottomGradient = ctx.createLinearGradient(
//     0,
//     2 * Y_SPACING + topHeight,
//     0,
//     height - Y_SPACING
//   );
//   bottomGradient.addColorStop(0, BOTTOM_COLOR_A);
//   bottomGradient.addColorStop(1, BOTTOM_COLOR_B);
// }

// function drawResults(
//   canvas: HTMLCanvasElement,
//   ctx: CanvasRenderingContext2D,
//   dataL: Float32Array,
//   dataR: Float32Array
// ) {
//   const progress = audio.currentTime / audio.duration;
//
//   /* init */
//   const { width, height } = canvas;
//   ctx.clearRect(0, 0, width, height);
//   ctx.save();
//   /* mask top */
//   const topHeight = 0.7 * (height - 3 * Y_SPACING);
//   const topBars = new Path2D();
//   dataL.forEach((val, i) => {
//     const x = i * (width / dataL.length);
//     const barheight = val * topHeight * 4;
//     topBars.rect(
//       i * (BAR_WIDTH + X_SPACING) + X_SPACING,
//       Y_SPACING + topHeight - barheight,
//       BAR_WIDTH,
//       barheight
//     );
//   });
//
//   ctx.clip(topBars);
//   /* draw top */
//   ctx.fillStyle = "white";
//   ctx.fillRect(0, Y_SPACING, width, topHeight);
//   ctx.fillStyle = topGradient;
//   ctx.fillRect(0, Y_SPACING, progress * width, topHeight);
//   /* mask bottom */
//   ctx.restore();
//   ctx.save();
//
//   const bottomHeight: number = 0.3 * (height - 3 * Y_SPACING);
//   const bottomBars: Path2D = new Path2D();
//
//   dataR.forEach((val: number, i: number) => {
//     const barheight: number = val * bottomHeight * 4;
//     bottomBars.rect(
//       i * (BAR_WIDTH + X_SPACING) + X_SPACING,
//       height - Y_SPACING - bottomHeight,
//       BAR_WIDTH,
//       barheight
//     );
//   });
//
//   ctx.clip(bottomBars);
//   /* draw bottom */
//   ctx.fillStyle = bottomUnplayedGradient;
//   ctx.fillRect(
//     progress * width,
//     2 * Y_SPACING + topHeight,
//     (1 - progress) * width,
//     bottomHeight
//   );
//   ctx.fillStyle = bottomGradient;
//   ctx.fillRect(0, 2 * Y_SPACING + topHeight, progress * width, bottomHeight);
//   /* finalize */
//   ctx.restore();
//
//   if (isDrawing) {
//     window.requestAnimationFrame(this.render);
//   }
// }

// audio.addEventListener("play", setupExperiment);

export {};

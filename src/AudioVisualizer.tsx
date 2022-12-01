import React, { MouseEvent, useEffect } from "react";
import {
  audioTrack,
  BAR_WIDTH,
  BOTTOM_COLOR_A,
  BOTTOM_COLOR_B,
  MAX_SAMPLES_PER_CHUNK,
  OUTPUT_RESOLUTION,
  TOP_COLOR_A,
  TOP_COLOR_B,
  X_SPACING,
  Y_SPACING,
} from "./constants";
import "./style.scss";

const AudioVisualizer = () => {
  let audioContext: AudioContext;
  let topGradient: CanvasGradient;
  let bottomUnplayedGradient: CanvasGradient;
  let bottomGradient: CanvasGradient;
  let isDrawing: boolean = false;
  let canvas: HTMLCanvasElement;
  let drawContext: CanvasRenderingContext2D;
  let audio: HTMLAudioElement;
  let render: any;

  /**
   * seekTrack
   * @param evt
   * @return void
   */
  const seekTrack = (evt: MouseEvent<HTMLCanvasElement>) => {
    const progress: number =
      evt.nativeEvent.offsetX / evt.currentTarget.offsetWidth;
    audio.currentTime = progress * audio.duration;
  };

  /**
   * startDrawing
   * @return void
   */
  const startDrawing = () => {
    isDrawing = true;
    window.requestAnimationFrame(render);
  };

  /**
   * stopDrawing
   * @return void
   */
  const stopDrawing = () => {
    isDrawing = false;
  };

  /**
   * getLevelsFromSamples
   * @param samples
   * @return void
   */
  function getLevelsFromSamples(samples: Float32Array) {
    const samplesPerChunk: number = Math.min(
      MAX_SAMPLES_PER_CHUNK,
      samples.length / OUTPUT_RESOLUTION
    );

    const stride: number = Math.floor(
      samples.length / OUTPUT_RESOLUTION / samplesPerChunk
    );

    const result: Float32Array = new Float32Array(OUTPUT_RESOLUTION);

    for (let sample: number = 0; sample < OUTPUT_RESOLUTION; sample += 1) {
      const chunkSamples: Float32Array = new Float32Array(samplesPerChunk);
      const offset: number = Math.floor(
        (sample * samples.length) / OUTPUT_RESOLUTION
      );

      for (let index: number = 0; index < samplesPerChunk; index += 1) {
        if (offset + index * stride < samples.length) {
          chunkSamples[index] = samples[offset + index * stride];
        }
      }

      result[sample] =
        chunkSamples.sort()[Math.floor(0.85 * chunkSamples.length)];
    }

    return result;
  }

  /**
   * #setupExperiment
   * @description  We have to load the data separately since we can't read raw
   * buffer data from the audio node in advance if all we wanted was realtime analysis,
   * the audio element alone would be enough
   * fetch audio - probably use fetch to do this instead of XHR
   * @return void
   */
  function setupExperiment() {
    audio.removeEventListener("play", setupExperiment);

    audioContext = new AudioContext();
    const url = audio.getAttribute("src")!;
    /*
     */
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    const loadStart: number = Date.now();

    request.onload = function () {
      console.log("Requesting data");
      audioContext.decodeAudioData(request.response).then((buffer) => {
        console.log(
          "Request complete",
          `Loading finished in ${(Date.now() - loadStart) / 1000}s`
        );
        processAudio(buffer);
      });
    };
    request.send();
    document.getElementById("message")!.textContent = "Loading…";
  }

  /**
   * #processAudio
   * @param buffer
   * @return void
   */
  function processAudio(buffer: AudioBuffer) {
    // Analyze data
    console.log("Analyzing buffer");
    document.getElementById("message")!.textContent = "Computing…";
    const startTime = Date.now();
    const outputArrayL = getLevelsFromSamples(buffer.getChannelData(0));
    const outputArrayR =
      buffer.numberOfChannels > 1
        ? getLevelsFromSamples(buffer.getChannelData(1))
        : outputArrayL;

    // Done
    console.log(
      "Analysis complete",
      `Finished in ${(Date.now() - startTime) / 1000}s`
    );
    document.getElementById("message")!.remove();

    // Prepare drawing
    canvas.width = (BAR_WIDTH + X_SPACING) * outputArrayL.length + X_SPACING;
    canvas.height = Math.floor(canvas.width / 6);

    prepareForDrawing(drawContext);
    render = drawResults.bind(
      Window,
      canvas,
      drawContext,
      outputArrayL,
      outputArrayR
    );
    render();
    audio.addEventListener("seeked", () =>
      drawResults(canvas, drawContext, outputArrayL, outputArrayR)
    );

    // Audio should've already started
    startDrawing();
  }

  /**
   * #prepareForDrawing
   * @param ctx
   * @return void
   */
  function prepareForDrawing(ctx: CanvasRenderingContext2D) {
    const { height } = canvas;
    const topHeight = 0.7 * (height - 3 * Y_SPACING);

    topGradient = ctx.createLinearGradient(
      0,
      Y_SPACING + topHeight,
      0,
      Y_SPACING
    );
    topGradient.addColorStop(0, TOP_COLOR_A);
    topGradient.addColorStop(1, TOP_COLOR_B);
    bottomUnplayedGradient = ctx.createLinearGradient(
      0,
      2 * Y_SPACING + topHeight,
      0,
      height - Y_SPACING
    );
    bottomUnplayedGradient.addColorStop(0, "rgba(255,255,255,0.4)");
    bottomUnplayedGradient.addColorStop(1, "rgba(255,255,255,0.0)");
    bottomGradient = ctx.createLinearGradient(
      0,
      2 * Y_SPACING + topHeight,
      0,
      height - Y_SPACING
    );
    bottomGradient.addColorStop(0, BOTTOM_COLOR_A);
    bottomGradient.addColorStop(1, BOTTOM_COLOR_B);
  }

  /**
   * drawResults
   * @param canvas
   * @param ctx
   * @param dataL
   * @param dataR
   * @return void
   */
  function drawResults(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    dataL: Float32Array,
    dataR: Float32Array
  ) {
    const progress = audio.currentTime / audio.duration;

    // Initialize
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Mask top
    const topHeight: number = 0.7 * (height - 3 * Y_SPACING);
    const topBars: Path2D = new Path2D();
    dataL.forEach((value, index) => {
      // const x: number = index * (width / dataL.length);
      const barHeight: number = value * topHeight * 4;
      topBars.rect(
        index * (BAR_WIDTH + X_SPACING) + X_SPACING,
        Y_SPACING + topHeight - barHeight,
        BAR_WIDTH,
        barHeight
      );
    });

    ctx.clip(topBars);
    // Draw top
    ctx.fillStyle = "white";
    ctx.fillRect(0, Y_SPACING, width, topHeight);
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, Y_SPACING, progress * width, topHeight);

    // Mask bottom
    ctx.restore();
    ctx.save();

    const bottomHeight: number = 0.3 * (height - 3 * Y_SPACING);
    const bottomBars: Path2D = new Path2D();

    dataR.forEach((value: number, index: number) => {
      const barHeight: number = value * bottomHeight * 4;
      bottomBars.rect(
        index * (BAR_WIDTH + X_SPACING) + X_SPACING,
        height - Y_SPACING - bottomHeight,
        BAR_WIDTH,
        barHeight
      );
    });

    ctx.clip(bottomBars);

    // Draw bottom
    ctx.fillStyle = bottomUnplayedGradient;
    ctx.fillRect(
      progress * width,
      2 * Y_SPACING + topHeight,
      (1 - progress) * width,
      bottomHeight
    );
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, 2 * Y_SPACING + topHeight, progress * width, bottomHeight);

    // Finalize
    ctx.restore();

    if (isDrawing) {
      window.requestAnimationFrame(render);
    }
  }

  useEffect(() => {
    canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    drawContext = canvas.getContext("2d", {
      alpha: true,
    }) as CanvasRenderingContext2D;
    audio = document.getElementById("audio") as HTMLAudioElement;
    audio.volume = 0.2;
  }, []);

  useEffect(() => {
    audio.addEventListener("play", setupExperiment);
  }, []);

  return (
    <div className="soundCloud">
      <div className="container">
        <canvas id="canvas" width="600" height="200" onClick={seekTrack} />
        <div id="message">
          Start audio file below to load visualization
        </div>{" "}
        <div className="bottom-bar">
          <audio
            id="audio"
            crossOrigin="anonymous"
            src={audioTrack}
            onPause={stopDrawing}
            onPlay={startDrawing}
            onSeeked={render}
            controls
          />
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;

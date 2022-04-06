import React, { useEffect, useRef } from "react";
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

const Soundcloud = () => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  let audioContext: AudioContext;
  let topGradient: any;
  let bottomUnplayedGradient: any;
  let bottomGradient: any;
  let isDrawing: boolean = false;
  let canvas: HTMLCanvasElement;
  let drawContext: CanvasRenderingContext2D;
  let audio: HTMLAudioElement;

  const seekTrack = (evt: any) => {
    const progress: number = evt.offsetX / evt.target.offsetWidth;
    audio.currentTime = progress * audio.duration;
  };

  const startDrawing = () => {
    isDrawing = true;
    window.requestAnimationFrame(render);
  };

  const stopDrawing = () => {
    isDrawing = false;
  };

  const render = () => {};

  function getLevelsFromSamples(samples: Float32Array) {
    const samplesPerChunk: number = Math.min(
      MAX_SAMPLES_PER_CHUNK,
      samples.length / OUTPUT_RESOLUTION
    );

    const stride = Math.floor(
      samples.length / OUTPUT_RESOLUTION / samplesPerChunk
    );

    const result: Float32Array = new Float32Array(OUTPUT_RESOLUTION);

    for (let s: number = 0; s < OUTPUT_RESOLUTION; s += 1) {
      const chunkSamples: Float32Array = new Float32Array(samplesPerChunk);
      const offset: number = Math.floor(
        (s * samples.length) / OUTPUT_RESOLUTION
      );

      for (let index: number = 0; index < samplesPerChunk; index += 1) {
        if (offset + index * stride < samples.length) {
          chunkSamples[index] = samples[offset + index * stride];
        }
      }

      result[s] = chunkSamples.sort()[Math.floor(0.85 * chunkSamples.length)];
    }
    return result;
  }

  function setupExperiment() {
    audio.removeEventListener("play", setupExperiment);

    audioContext = new AudioContext();
    const url = audio.getAttribute("src")!;
    /*
       we have to load the data separately since we can't read raw buffer data from the audio node in advance
       if all we wanted was realtime analysis, the audio element alone would be enough
       fetch audio - probably use fetch to do this instead of XHR
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

  function processAudio(buffer: AudioBuffer) {
    /* Analyze data */
    console.log("Analyzing buffer");
    document.getElementById("message")!.textContent = "Computing…";
    const startTime = Date.now();
    const outputArrayL = getLevelsFromSamples(buffer.getChannelData(0));
    const outputArrayR =
      buffer.numberOfChannels > 1
        ? getLevelsFromSamples(buffer.getChannelData(1))
        : outputArrayL;

    /* done  -----------------------------------------------------------------------------------> */
    console.log(
      "Analysis complete",
      `Finished in ${(Date.now() - startTime) / 1000}s`
    );
    document.getElementById("message")!.remove();

    /* get drawing ready  ----------------------------------------------------------------------> */
    canvas.width = (BAR_WIDTH + X_SPACING) * outputArrayL.length + X_SPACING;
    canvas.height = Math.floor(canvas.width / 6);
    prepareForDrawing(drawContext);

    drawResults(canvas, drawContext, outputArrayL, outputArrayR);

    // canvas.addEventListener("click", seekTrack);
    // audio.addEventListener("play", startDrawing);
    // audio.addEventListener("pause", stopDrawing);
    audio.addEventListener("seeked", () =>
      drawResults(canvas, drawContext, outputArrayL, outputArrayR)
    );

    /* audio should have already started */
    startDrawing();
  }

  function prepareForDrawing(ctx: CanvasRenderingContext2D) {
    const { height } = canvas;
    const topHeight = 0.7 * (height - 3 * Y_SPACING);
    // const bottomHeight = 0.3 * (height - 3 * Y_SPACING);

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

  function drawResults(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    dataL: Float32Array,
    dataR: Float32Array
  ) {
    const progress = audio.currentTime / audio.duration;

    console.log(`PROGRESS ->`, progress);
    /* initialize -------------------------------------------------------------------------> */
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    /* mask top  --------------------------------------------------------------------------> */
    const topHeight: number = 0.7 * (height - 3 * Y_SPACING);
    const topBars: Path2D = new Path2D();
    dataL.forEach((value, index) => {
      // const x: number = index * (width / dataL.length);
      const barheight: number = value * topHeight * 4;
      topBars.rect(
        index * (BAR_WIDTH + X_SPACING) + X_SPACING,
        Y_SPACING + topHeight - barheight,
        BAR_WIDTH,
        barheight
      );
    });

    ctx.clip(topBars);
    /* draw top  --------------------------------------------------------------------------> */
    ctx.fillStyle = "white";
    ctx.fillRect(0, Y_SPACING, width, topHeight);
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, Y_SPACING, progress * width, topHeight);

    /* mask bottom  -----------------------------------------------------------------------> */
    ctx.restore();
    ctx.save();

    const bottomHeight: number = 0.3 * (height - 3 * Y_SPACING);
    const bottomBars: Path2D = new Path2D();

    dataR.forEach((value: number, index: number) => {
      const barheight: number = value * bottomHeight * 4;
      bottomBars.rect(
        index * (BAR_WIDTH + X_SPACING) + X_SPACING,
        height - Y_SPACING - bottomHeight,
        BAR_WIDTH,
        barheight
      );
    });

    ctx.clip(bottomBars);

    /* draw bottom  ------------------------------------------------------------------------> */
    ctx.fillStyle = bottomUnplayedGradient;
    ctx.fillRect(
      progress * width,
      2 * Y_SPACING + topHeight,
      (1 - progress) * width,
      bottomHeight
    );
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, 2 * Y_SPACING + topHeight, progress * width, bottomHeight);

    /* finalize  ---------------------------------------------------------------------------> */
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
        <canvas
          ref={canvasRef}
          id="canvas"
          width="600"
          height="200"
          onClick={seekTrack}
        />
        <div id="message">Start audio file below to load visualization</div>
      </div>
      <div className="bottom-bar">
        <audio
          ref={audioRef}
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
  );
};

export default Soundcloud;

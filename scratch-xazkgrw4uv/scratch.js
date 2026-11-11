(function () {
  "use strict";

  var guide = document.getElementById("guide");
  var scratchPanel = document.getElementById("scratch-panel");
  var canvas = document.getElementById("scratch-canvas");
  var poemPaper = document.getElementById("poem-paper");
  var lineOne = document.getElementById("poem-line-one");
  var lineTwo = document.getElementById("poem-line-two");
  var status = document.getElementById("scratch-status");
  var revealButton = document.getElementById("reveal-button");

  var context = canvas.getContext("2d");
  var sample = document.createElement("canvas");
  sample.width = 48;
  sample.height = 34;
  var sampleContext = sample.getContext("2d", { willReadFrequently: true });
  var state = {
    width: 0,
    height: 0,
    dpr: 1,
    scratching: false,
    lastPoint: null,
    checkTicks: 0,
    revealed: false,
    resizeFrame: 0
  };

  var initialStatus = "用手指或鼠标在卡面上来回刮。";
  var revealedStatus = "生日快乐。";

  function decodeUtf8(bytes) {
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }

    var encoded = Array.prototype.map.call(bytes, function (value) {
      return "%" + value.toString(16).padStart(2, "0");
    }).join("");
    return decodeURIComponent(encoded);
  }

  function decodeFragment(fragment) {
    var raw = fragment.charAt(0) === "#" ? fragment.slice(1) : fragment;

    if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw) || raw.length % 4 === 1) {
      return null;
    }

    try {
      var base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      var padding = "=".repeat((4 - (base64.length % 4)) % 4);
      var binary = window.atob(base64 + padding);
      var bytes = new Uint8Array(binary.length);

      for (var index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      var decoded = decodeUtf8(bytes);
      var lines = decoded.split(/\r\n|\r|\n/);

      if (lines.length !== 2 || lines.some(function (line) {
        return line.trim().length === 0;
      })) {
        return null;
      }

      return lines;
    } catch (error) {
      return null;
    }
  }

  function setStatus(message, revealed) {
    status.textContent = message;
    status.classList.toggle("is-revealed", Boolean(revealed));
  }

  function showGuide() {
    guide.hidden = false;
    scratchPanel.hidden = true;
  }

  function showScratchCard(lines) {
    lineOne.textContent = lines[0];
    lineTwo.textContent = lines[1];
    guide.hidden = true;
    scratchPanel.hidden = false;
    state.revealed = false;
    state.scratching = false;
    state.lastPoint = null;
    state.checkTicks = 0;
    poemPaper.setAttribute("aria-hidden", "true");
    canvas.removeAttribute("aria-disabled");
    canvas.setAttribute("aria-label", "刮开生日卡片，或按 Enter 键揭晓");
    canvas.tabIndex = 0;
    revealButton.disabled = false;
    revealButton.hidden = false;
    setStatus(initialStatus, false);

    window.requestAnimationFrame(function () {
      resizeCanvas(false);
    });
  }

  function nextNoise(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  function drawMetallicLayer() {
    var width = state.width;
    var height = state.height;
    var gradient = context.createLinearGradient(0, 0, width, height);
    var seed = 23817;

    gradient.addColorStop(0, "#c4c8c4");
    gradient.addColorStop(0.2, "#e3d09d");
    gradient.addColorStop(0.43, "#9da6aa");
    gradient.addColorStop(0.7, "#f1dfae");
    gradient.addColorStop(1, "#aeb5b1");

    context.globalCompositeOperation = "source-over";
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.2;
    context.lineWidth = 1;
    for (var stripe = -height; stripe < width + height; stripe += 18) {
      context.beginPath();
      context.moveTo(stripe, 0);
      context.lineTo(stripe + height, height);
      context.strokeStyle = stripe % 36 === 0 ? "#fff5d7" : "#657073";
      context.stroke();
    }

    for (var dot = 0; dot < 240; dot += 1) {
      seed = nextNoise(seed);
      var x = (seed / 4294967296) * width;
      seed = nextNoise(seed);
      var y = (seed / 4294967296) * height;
      seed = nextNoise(seed);
      var radius = 0.35 + (seed / 4294967296) * 1.3;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = dot % 2 === 0 ? "#fff5d7" : "#687174";
      context.fill();
    }
    context.restore();

    context.save();
    context.fillStyle = "rgba(61, 61, 56, 0.62)";
    context.font = "600 13px ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.letterSpacing = "2px";
    context.fillText("刮开这里", width / 2, height / 2);
    context.restore();
  }

  function resizeCanvas(preserve) {
    if (scratchPanel.hidden) {
      return;
    }

    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    var oldCanvas = null;
    if (preserve && canvas.width && canvas.height) {
      oldCanvas = document.createElement("canvas");
      oldCanvas.width = canvas.width;
      oldCanvas.height = canvas.height;
      oldCanvas.getContext("2d").drawImage(canvas, 0, 0);
    }

    state.dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = Math.max(1, Math.round(state.width * state.dpr));
    canvas.height = Math.max(1, Math.round(state.height * state.dpr));

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = "source-over";

    if (oldCanvas) {
      context.drawImage(oldCanvas, 0, 0, oldCanvas.width, oldCanvas.height, 0, 0, canvas.width, canvas.height);
    }

    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    if (!oldCanvas) {
      drawMetallicLayer();
    }

    if (state.revealed) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }
  }

  function pointFromEvent(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(state.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(state.height, event.clientY - rect.top))
    };
  }

  function scratchAt(point) {
    var radius = Math.max(21, Math.min(37, state.width * 0.07));

    context.save();
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = radius * 2;
    context.beginPath();
    if (state.lastPoint) {
      context.moveTo(state.lastPoint.x, state.lastPoint.y);
    } else {
      context.moveTo(point.x, point.y);
    }
    context.lineTo(point.x, point.y);
    context.stroke();
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    state.lastPoint = point;
    state.checkTicks += 1;

    if (state.checkTicks % 7 === 0 && revealProgress() >= 0.33) {
      reveal();
    }
  }

  function revealProgress() {
    if (!canvas.width || !canvas.height) {
      return 0;
    }

    sampleContext.clearRect(0, 0, sample.width, sample.height);
    sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
    var pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
    var clear = 0;
    for (var alpha = 3; alpha < pixels.length; alpha += 4) {
      if (pixels[alpha] < 60) {
        clear += 1;
      }
    }

    return clear / (sample.width * sample.height);
  }

  function reveal() {
    if (state.revealed) {
      return;
    }

    state.revealed = true;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    poemPaper.removeAttribute("aria-hidden");
    canvas.setAttribute("aria-label", "生日诗句已揭晓");
    canvas.setAttribute("aria-disabled", "true");
    canvas.tabIndex = -1;
    revealButton.hidden = true;
    setStatus(revealedStatus, true);
  }

  function stopScratching(event) {
    if (state.scratching && !state.revealed && revealProgress() >= 0.33) {
      reveal();
    }
    state.scratching = false;
    state.lastPoint = null;
    if (event && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function scheduleResize() {
    if (state.resizeFrame) {
      return;
    }
    state.resizeFrame = window.requestAnimationFrame(function () {
      state.resizeFrame = 0;
      resizeCanvas(true);
    });
  }

  canvas.addEventListener("pointerdown", function (event) {
    if (state.revealed) {
      return;
    }
    event.preventDefault();
    state.scratching = true;
    state.lastPoint = null;
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
    scratchAt(pointFromEvent(event));
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!state.scratching || state.revealed) {
      return;
    }
    event.preventDefault();
    scratchAt(pointFromEvent(event));
  });

  canvas.addEventListener("pointerup", stopScratching);
  canvas.addEventListener("pointercancel", stopScratching);
  canvas.addEventListener("lostpointercapture", function () {
    state.scratching = false;
    state.lastPoint = null;
  });

  canvas.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && !state.revealed) {
      event.preventDefault();
      reveal();
    }
  });

  revealButton.addEventListener("click", reveal);
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);

  function initFromHash() {
    var lines = decodeFragment(window.location.hash);
    if (lines) {
      showScratchCard(lines);
    } else {
      showGuide();
    }
  }

  window.addEventListener("hashchange", initFromHash);
  initFromHash();
}());

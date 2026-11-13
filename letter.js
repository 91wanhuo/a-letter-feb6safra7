"use strict";

const riddles = [
  {
    station: "照片 01 · 水族馆",
    photo: "aquarium",
    alt: "水族馆里的蓝紫色展缸",
    question: "水族馆的玻璃后面，漂来漂去的是水母还是鱼？",
    choices: ["水母", "鱼"],
    answer: 0,
    hint: "看看它们的身体，是不是透明的？",
    reply: "是水母！这张照片的光，到现在看还是很漂亮。"
  },
  {
    station: "照片 02 · 长沙",
    photo: "chocolate",
    alt: "在长沙巧克力博物馆招牌前的照片",
    question: "博物馆有哪一款巧克力？",
    choices: ["红军", "秦始皇", "秦皇岛", "巴厘岛"],
    answer: 0,
    hint: "再想想那天在馆里看到的名字。",
    reply: "答对啦，是红军。"
  },
  {
    station: "照片 03 · 天黑以后",
    photo: "night",
    alt: "夜晚的庭院和深蓝色天空",
    question: "夜空中有多少颗星星？",
    choices: ["1", "1218", "6974", "数不清"],
    answer: 1,
    hint: "再猜一次，试试别的数字。",
    reply: "答对啦，1218 颗。"
  },
  {
    station: "照片 04 · 我们做的杯子",
    photo: "cup",
    alt: "有立体装饰的手作杯",
    question: "我们一起做的杯子上有小熊、花和什么？",
    choices: ["小星星", "蝴蝶结", "小月亮"],
    answer: 1,
    hint: "找一找杯身正面那块粉色的装饰。",
    reply: "是蝴蝶结。这个杯子，是我们一起做的。"
  },
  {
    station: "照片 05 · 那张合照",
    photo: "wall",
    alt: "长沙的红砖墙前的一张合照",
    question: "这一刻是我们在一起的多久了？",
    choices: ["116421 小时", "365天", "8185233 分钟", "4.32 亿秒"],
    answer: 2,
    hint: "试着按分钟想一想。",
    reply: "是 8185233 分钟。下一关还有一张照片等着你。"
  }
];

const byId = (id) => document.getElementById(id);
const welcome = byId("welcome");
const quiz = byId("quiz");
const reveal = byId("reveal");
const choices = byId("choices");
const next = byId("next");
const feedback = byId("feedback");
const photo = byId("question-photo");
const photoView = byId("photo-view");
const photoLoading = byId("photo-loading");
const secondView = byId("second-view");
const secondPhoto = byId("second-photo");
const dialog = byId("photo-dialog");
const largePhoto = byId("large-photo");
const photos = new Map();
const localPhotos = window.birthdayPreviewPhotos ?? null;
let photoKey;
let current = 0;
let solved = false;

async function openPhoto(label) {
  if (localPhotos?.[label]) return localPhotos[label];
  if (photos.has(label)) return photos.get(label);
  const pending = (async () => {
    const response = await fetch("./photos/" + label + ".enc");
    if (!response.ok) throw new Error("Photo unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 29) throw new Error("Photo incomplete");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, 12) }, photoKey, bytes.subarray(12));
    const type = new DataView(plain).getUint32(0) === 0x89504e47 ? "image/png" : "image/jpeg";
    return URL.createObjectURL(new Blob([plain], { type }));
  })();
  photos.set(label, pending);
  try {
    return await pending;
  } catch (error) {
    photos.delete(label);
    throw error;
  }
}

function enlarge(image) {
  if (!image.getAttribute("src")) return;
  largePhoto.src = image.src;
  largePhoto.alt = image.alt;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    window.open(image.src, "_blank", "noopener");
  }
}

photoView.addEventListener("click", () => enlarge(photo));
secondView.addEventListener("click", () => enlarge(secondPhoto));
byId("close-photo").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

async function showPhoto(item, index) {
  photo.hidden = true;
  photoView.disabled = true;
  photoLoading.textContent = "正在取出这张照片…";
  photoLoading.hidden = false;
  try {
    const url = await openPhoto(item.photo);
    if (current !== index || quiz.hidden) return;
    photo.src = url;
    photo.alt = item.alt;
    photo.hidden = false;
    photoLoading.hidden = true;
    photoView.disabled = false;
    if (riddles[index + 1]) openPhoto(riddles[index + 1].photo).catch(() => {});
  } catch {
    if (current === index) photoLoading.textContent = "照片没能打开，可以重新扫一下生日卡。";
  }
}

function showQuestion(index) {
  current = index;
  solved = false;
  const item = riddles[index];
  welcome.hidden = true;
  reveal.hidden = true;
  quiz.hidden = false;
  next.hidden = true;
  feedback.textContent = "";
  feedback.classList.remove("correct");
  byId("counter").textContent = "第一关 · 第 " + (index + 1) + " / " + riddles.length + " 题";
  byId("segments").replaceChildren(...riddles.map((_, i) => {
    const segment = document.createElement("i");
    if (i <= index) segment.className = "active";
    return segment;
  }));
  byId("station").textContent = item.station;
  byId("question").textContent = item.question;
  choices.replaceChildren(...item.choices.map((label, i) => {
    const button = document.createElement("button");
    const badge = document.createElement("span");
    button.type = "button";
    button.className = "choice";
    badge.className = "badge";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = String.fromCharCode(65 + i);
    button.append(badge, label);
    button.addEventListener("click", () => {
      if (solved || button.disabled) return;
      if (i !== item.answer) {
        button.classList.add("miss");
        button.disabled = true;
        feedback.textContent = item.hint;
        [...choices.children].find((choice) => !choice.disabled)?.focus({ preventScroll: true });
        return;
      }
      solved = true;
      button.classList.add("hit");
      badge.textContent = "✓";
      for (const choice of choices.children) choice.disabled = true;
      feedback.classList.add("correct");
      feedback.textContent = item.reply;
      next.textContent = index + 1 < riddles.length ? "下一题 →" : "打开第二关 →";
      next.hidden = false;
      next.focus({ preventScroll: true });
    });
    return button;
  }));
  showPhoto(item, index);
  window.scrollTo(0, 0);
  byId("question").focus({ preventScroll: true });
}

byId("start").addEventListener("click", async () => {
  const start = byId("start");
  const error = byId("open-error");
  const code = location.hash.slice(1);
  start.disabled = true;
  error.hidden = true;
  try {
    if (!localPhotos) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !window.crypto?.subtle) throw new Error("Invalid photo link");
      const bytes = Uint8Array.from(atob(code.replaceAll("-", "+").replaceAll("_", "/") + "="), (x) => x.charCodeAt(0));
      photoKey = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]);
    }
    await openPhoto(riddles[0].photo);
    showQuestion(0);
  } catch {
    error.hidden = false;
  } finally {
    start.disabled = false;
  }
});

async function showSecondPhoto() {
  const pending = byId("photo-pending");
  try {
    if (localPhotos) {
      if (!localPhotos.second) return;
    } else {
      const response = await fetch("./photos/manifest.json", { cache: "no-cache" });
      if (!response.ok || !(await response.json()).second) return;
    }
    pending.textContent = "正在取出第二关的照片…";
    secondPhoto.src = await openPhoto("second");
    secondView.hidden = false;
    pending.hidden = true;
  } catch {
    pending.textContent = "这张照片没能打开，可以重新扫一下生日卡。";
  }
}

next.addEventListener("click", () => {
  if (!solved) return;
  if (current + 1 < riddles.length) {
    showQuestion(current + 1);
    return;
  }
  quiz.hidden = true;
  reveal.hidden = false;
  showSecondPhoto();
  window.scrollTo(0, 0);
  byId("reveal-title").focus({ preventScroll: true });
});

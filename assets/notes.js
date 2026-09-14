/* CSCI 240 notes — theme toggle, TOC scrollspy, MIPS assembly highlighting.
   No external dependencies: these notes work with no internet connection. */
(function () {
  "use strict";

  // ---------------------------------------------------------------- theme
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("cs240-theme");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) { /* storage may be unavailable */ }

  function toggleTheme() {
    var cur = root.getAttribute("data-theme");
    if (!cur) {
      var prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      cur = prefersDark ? "dark" : "light";
    }
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("cs240-theme", next); } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themebtn");
    if (btn) btn.addEventListener("click", toggleTheme);

    // ------------------------------------------------------------ TOC
    var tocTitle = document.querySelector(".toc-title");
    var toc = document.querySelector(".toc");
    if (tocTitle && toc) {
      tocTitle.addEventListener("click", function () {
        if (window.innerWidth <= 1080) toc.classList.toggle("collapsed");
      });
      if (window.innerWidth <= 1080) toc.classList.add("collapsed");
    }

    var links = Array.prototype.slice.call(
      document.querySelectorAll(".toc a[href^='#']"));
    if (links.length) {
      var targets = links.map(function (a) {
        return document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
      });
      var spy = function () {
        var best = -1, y = window.scrollY + 110;
        for (var i = 0; i < targets.length; i++) {
          if (targets[i] && targets[i].offsetTop <= y) best = i;
        }
        links.forEach(function (a, i) { a.classList.toggle("active", i === best); });
      };
      window.addEventListener("scroll", spy, { passive: true });
      spy();
    }

    // ------------------------------------------------------------ MIPS asm
    var DIRECTIVES = /^\.(text|data|globl|global|word|byte|half|space|asciiz|ascii|align|include|kdata|ktext|float|double|extern|set)\b/;
    var INSTR = new RegExp("^(add|addi|addiu|addu|sub|subu|mul|mult|multu|div|divu|" +
      "and|andi|or|ori|xor|xori|nor|not|neg|sll|srl|sra|sllv|srlv|srav|" +
      "lw|sw|lb|lbu|sb|lh|lhu|sh|la|li|lui|move|mfhi|mflo|mthi|mtlo|" +
      "beq|bne|beqz|bnez|bge|bgt|ble|blt|bgez|bgtz|blez|bltz|b|j|jal|jr|jalr|" +
      "slt|slti|sltu|sgt|sge|sle|sne|seq|rem|remu|abs|syscall|nop|" +
      "add\\.s|sub\\.s|mul\\.s|div\\.s|l\\.s|s\\.s|mov\\.s|cvt\\.s\\.w|cvt\\.w\\.s)$", "i");

    function esc(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function hiLine(line) {
      // 1. peel off a trailing comment that is not inside a string literal
      var comment = "", inStr = false, ci = -1;
      for (var i = 0; i < line.length; i++) {
        if (line[i] === '"') inStr = !inStr;
        else if (line[i] === "#" && !inStr) { ci = i; break; }
      }
      if (ci >= 0) { comment = line.slice(ci); line = line.slice(0, ci); }

      // 2. stash string literals so nothing else can touch them
      var strs = [];
      line = line.replace(/"(?:[^"\\]|\\.)*"?/g, function (m) {
        strs.push(m); return "\u0000" + (strs.length - 1) + "\u0000";
      });

      // 3. tokenise and classify
      var tokens = line.split(/(\s+|,|\(|\)|:)/);
      var out = "", first = true;
      for (var k = 0; k < tokens.length; k++) {
        var t = tokens[k];
        if (!t) continue;
        if (/^(\s+|,|\(|\)|:)$/.test(t)) { out += esc(t); continue; }
        var next = "";
        for (var j = k + 1; j < tokens.length; j++) {
          if (tokens[j] && !/^\s+$/.test(tokens[j])) { next = tokens[j]; break; }
        }
        if (/^\u0000\d+\u0000$/.test(t)) { out += t; continue; }
        if (DIRECTIVES.test(t)) { out += '<span class="d">' + esc(t) + "</span>"; first = false; continue; }
        if (/^\$/.test(t)) { out += '<span class="r">' + esc(t) + "</span>"; continue; }
        if (next === ":") { out += '<span class="l">' + esc(t) + "</span>"; first = false; continue; }
        if (first && INSTR.test(t)) { out += '<span class="k">' + esc(t) + "</span>"; first = false; continue; }
        if (/^-?(0x[0-9a-fA-F]+|\d+)$/.test(t)) { out += '<span class="n">' + esc(t) + "</span>"; continue; }
        out += esc(t);
        if (t.trim()) first = false;
      }

      // 4. put the string literals back, highlighted
      out = out.replace(/\u0000(\d+)\u0000/g, function (m, n) {
        return '<span class="s">' + esc(strs[+n]) + "</span>";
      });
      if (comment) out += '<span class="c">' + esc(comment) + "</span>";
      return out;
    }

    Array.prototype.forEach.call(document.querySelectorAll("pre.asm"), function (pre) {
      var src = pre.textContent.replace(/\n$/, "");
      pre.innerHTML = src.split("\n").map(hiLine).join("\n");
    });
  });
})();

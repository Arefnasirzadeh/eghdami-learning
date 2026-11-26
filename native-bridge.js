/* Android app bridge: gives the Android app (WebView) speech + mic through the phone's own engines. Does nothing in a normal browser. */
(function () {
  var N = window.EghdamiNative; if (!N) return;
  var cbs = {}, id = 0;
  window.__eghdamiCb = function (k, ev, data) {
    var c = cbs[k]; if (!c) return;
    if (ev === "start") { c.onstart && c.onstart(); }
    else if (ev === "result") { c.onresult && c.onresult({ results: [[{ transcript: data, confidence: 1 }]], resultIndex: 0 }); }
    else if (ev === "error") { c.onerror && c.onerror({ error: data }); }
    else if (ev === "end") { c.onend && c.onend(); delete cbs[k]; }
  };
  function Utt(t) { this.text = t || ""; this.lang = "en-GB"; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; }
  window.SpeechSynthesisUtterance = Utt;
  var voices = [{ name: "UK English (Android)", lang: "en-GB", "default": true, localService: true, voiceURI: "android-en-GB" }];
  window.speechSynthesis = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    speak: function (u) { var k = "t" + (++id); cbs[k] = u; N.speak(k, String(u.text), u.lang || "en-GB", +u.rate || 1, +u.pitch || 1); },
    cancel: function () { N.stopSpeak(); }, pause: function () {}, resume: function () {},
    getVoices: function () { return voices; }, addEventListener: function () {}, removeEventListener: function () {}
  };
  function SR() { this.lang = "en-GB"; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; }
  SR.prototype.start = function () { var k = "r" + (++id); cbs[k] = this; N.listen(k, this.lang || "en-GB"); };
  SR.prototype.stop = SR.prototype.abort = function () { N.stopListen(); };
  window.SpeechRecognition = window.webkitSpeechRecognition = SR;
})();

(() => {
  let lastSignature = "";
  let lastMultiplier = null;
  let lastDownloadTime = 0;
  let lastTopRoundsTime = 0;
  const DEBOUNCE_MS = 500; // Prevent downloading the same round within 500ms
  const TOP_ROUNDS_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours for top rounds extraction
  const SESSION_GAP_MS = 48 * 60 * 60 * 1000; // 48 hours session gap

  function normalizeMultiplier(text) {
    return parseFloat(
      String(text)
        .replace(/,/g, "")
        .replace(/x/gi, "")
        .trim()
    );
  }

  function getLatestNode() {
    return document.querySelector("div.payout.ng-star-inserted");
  }

  function parseTopRoundsTimestamp(text) {
    // Parse format: "26.07.26 03:53" -> DD.MM.YY HH:MM
    const match = text.trim().match(/(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return null;

    const [, day, month, year, hour, minute] = match;
    // Assume 20xx for years 00-99
    const fullYear = 2000 + parseInt(year, 10);
    const date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hour, 10), parseInt(minute, 10));
    return date.toISOString();
  }

  function getDayDate(isoString) {
    return isoString.split('T')[0]; // YYYY-MM-DD
  }

  function getHourInterval(isoString) {
    const hour = new Date(isoString).getHours();
    return Math.floor(hour / 1); // 1-hour intervals
  }

  function generateSessionId(timestamp) {
    // Generate session ID based on 48-hour grouping
    const epoch = new Date(timestamp).getTime();
    const sessionNumber = Math.floor(epoch / SESSION_GAP_MS);
    return `session_${sessionNumber}`;
  }

  function extractTopRounds() {
    // Find the top rounds list container
    const topRoundsContainer = document.querySelector("app-top-rounds-list");
    if (!topRoundsContainer) {
      console.log("[Momento] Top rounds container not found");
      return null;
    }

    const items = topRoundsContainer.querySelectorAll("app-top-rounds-list-item");
    const topRounds = [];

    items.forEach(item => {
      try {
        const dateDiv = item.querySelector(".top-rounds-list-item-column.date");
        const xDiv = item.querySelector(".top-rounds-list-item-column.x");

        if (!dateDiv || !xDiv) return;

        const timestampText = dateDiv.textContent.trim();
        const multiplierText = xDiv.textContent.trim();
        const color = xDiv.style.color || getComputedStyle(xDiv).color;

        const timestamp = parseTopRoundsTimestamp(timestampText);
        if (!timestamp) return;

        const multiplier = normalizeMultiplier(multiplierText);
        if (!multiplier || multiplier <= 0) return;

        topRounds.push({
          timestamp: timestamp,
          multiplier: multiplier,
          color: color,
          raw_html: item.outerHTML,
          day_date: getDayDate(timestamp),
          hour_interval: getHourInterval(timestamp),
          session_id: generateSessionId(timestamp)
        });
      } catch (err) {
        console.warn("[Momento] Failed to parse top round item:", err);
      }
    });

    return topRounds;
  }

  function downloadTopRounds(topRounds) {
    if (!topRounds || topRounds.length === 0) return;

    const payload = {
      source: "aviator",
      type: "top_rounds",
      collectedAt: new Date().toISOString(),
      top_rounds: topRounds
    };

    const filename = `momento_top_rounds_aviator_${Date.now()}.json`;

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(a.href), 1000);

    console.log("[Momento] Downloaded top rounds:", filename, topRounds.length, "rounds");
  }

  function downloadRound(round) {
    const payload = {
      source: "aviator",
      collectedAt: round.timestamp,
      rounds: [round]
    };

    const filename = `momento_rounds_aviator_${Date.now()}.json`;

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(a.href), 1000);

    console.log("[Momento] Downloaded:", filename, round);
  }

  function check() {
    const node = getLatestNode();
    if (!node) return;

    const text = node.textContent.trim();
    if (!text) return;

    const multiplier = normalizeMultiplier(text);
    if (!multiplier || multiplier <= 0) return;

    const signature = `${multiplier}|${node.style.color}`;
    const now = Date.now();

    // Skip if same signature as last check
    if (signature === lastSignature) return;

    // Skip if same multiplier within debounce window
    if (multiplier === lastMultiplier && (now - lastDownloadTime) < DEBOUNCE_MS) {
      return;
    }

    // Only download if multiplier changed or debounce window passed
    if (multiplier !== lastMultiplier || (now - lastDownloadTime) >= DEBOUNCE_MS) {
      lastSignature = signature;
      lastMultiplier = multiplier;
      lastDownloadTime = now;

      const round = {
        timestamp: new Date().toISOString(),
        multiplier: multiplier,
        color: node.style.color || getComputedStyle(node).color,
        source: "aviator"
      };

      downloadRound(round);
    }

    // Check if it's time to extract top rounds (24hr interval)
    if ((now - lastTopRoundsTime) >= TOP_ROUNDS_INTERVAL_MS || lastTopRoundsTime === 0) {
      const topRounds = extractTopRounds();
      if (topRounds && topRounds.length > 0) {
        downloadTopRounds(topRounds);
        lastTopRoundsTime = now;
      }
    }
  }

  // Capture the current latest round immediately.
  check();

  // Extract top rounds on first load
  setTimeout(() => {
    const topRounds = extractTopRounds();
    if (topRounds && topRounds.length > 0) {
      downloadTopRounds(topRounds);
      lastTopRoundsTime = Date.now();
    }
  }, 2000); // Wait 2 seconds for page to fully load

  // Poll 10×/second for a new latest round.
  const interval = setInterval(check, 100);

  console.log("[Momento] Real-time collector started.");
  console.log("[Momento] Top rounds extraction enabled (24hr interval).");
  console.log("[Momento] To stop: clearInterval(" + interval + ");");
})();
/**
 * wplog — Shot Details
 *
 * Second-step dialog for "Tiro" (Shot/Goal) events: shot type,
 * outcome, (if saved/blocked) which opponent made the play, and
 * finally the goal-zone the shot was aimed at.
 */

export const ShotDetails = {

    SHOT_TYPES: ["A", "X", "CA", "6mt", "PS", "C"],

    OUTCOMES: [
        { code: "goal", label: "Goal" },
        { code: "saved", label: "Parato" },
        { code: "blocked", label: "Stoppato" },
        { code: "post", label: "Palo" },
        { code: "wide", label: "Fuori" }
    ],

    ZONES: [
        { code: "TL", label: "Alto Sx" },
        { code: "TC", label: "Alto Centro" },
        { code: "TR", label: "Alto Dx" },
        { code: "BL", label: "Basso Sx" },
        { code: "BC", label: "Basso Centro" },
        { code: "BR", label: "Basso Dx" },
        { code: "WL", label: "Fuori Sx" },
        { code: "WR", label: "Fuori Dx" },
        { code: "WT", label: "Alto Fuori" }
    ],

    /**
     * Opens the shot-details dialog.
     * Resolves with { shotType, outcome, opponentCap, zone } or null if cancelled.
     *
     * @param {object} game - current game object
     * @param {string} team - shooter's team, "W" or "D"
     */
    prompt(game, team) {
        return new Promise((resolve) => {

            this._installStyles();

            const oppTeam = team === "W" ? "D" : "W";

            const dlg = document.createElement("dialog");
            dlg.className = "shotdetails-dialog-wrap";

            dlg.innerHTML = `
                <div class="shotdetails-dialog">

                    <h2>Dettagli tiro</h2>

                    <div class="sd-step">
                        <div class="sd-label">1. TIPO DI TIRO</div>
                        <div class="sd-grid sd-grid-shottype" data-shottype>
                            ${this.SHOT_TYPES.map(t => `
                                <button type="button" class="sd-opt" data-value="${t}">${t}</button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="sd-step">
                        <div class="sd-label">2. ESITO</div>
                        <div class="sd-grid" data-outcome>
                            ${this.OUTCOMES.map(o => `
                                <button type="button" class="sd-opt" data-value="${o.code}">${o.label}</button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="sd-step hidden" data-opponent-step>
                        <div class="sd-label" data-opponent-label>3. CHI HA PARATO?</div>
                        <div class="sd-grid sd-grid-opponent" data-opponent>
                            ${this._opponentButtons(game, oppTeam)}
                        </div>
                    </div>

                    <div class="sd-step" data-zone-step>
                        <div class="sd-label">4. ZONA DELLA PORTA</div>
                        <div class="sd-goal" data-zone>
                            <button type="button" class="sd-zone sd-zone-wt" data-value="WT">ALTO FUORI</button>
                            <button type="button" class="sd-zone sd-zone-wl" data-value="WL">FUORI SX</button>
                            <button type="button" class="sd-zone sd-zone-tl" data-value="TL">AS</button>
                            <button type="button" class="sd-zone sd-zone-tc" data-value="TC">AC</button>
                            <button type="button" class="sd-zone sd-zone-tr" data-value="TR">AD</button>
                            <button type="button" class="sd-zone sd-zone-wr" data-value="WR">FUORI DX</button>
                            <button type="button" class="sd-zone sd-zone-bl" data-value="BL">BS</button>
                            <button type="button" class="sd-zone sd-zone-bc" data-value="BC">BC</button>
                            <button type="button" class="sd-zone sd-zone-br" data-value="BR">BD</button>
                        </div>
                    </div>

                    <div class="shotdetails-actions">
                        <button type="button" data-cancel>Annulla</button>
                        <button type="button" class="primary" data-confirm disabled>CONFERMA TIRO</button>
                    </div>

                </div>
            `;

            dlg.addEventListener("click", (e) => {
                if (e.target === dlg) this._close(dlg, resolve, null);
            });

            document.body.appendChild(dlg);

            let shotType = null;
            let outcome = null;
            let opponentCap = null;
            let zone = null;

            const opponentStep = dlg.querySelector("[data-opponent-step]");
            const opponentLabel = dlg.querySelector("[data-opponent-label]");
            const confirmBtn = dlg.querySelector("[data-confirm]");

            const needsOpponent = () => outcome === "saved" || outcome === "blocked";

            const updateOpponentVisibility = () => {
                if (needsOpponent()) {
                    opponentStep.classList.remove("hidden");
                    opponentLabel.textContent = outcome === "saved"
                        ? "3. CHI HA PARATO?"
                        : "3. CHI HA STOPPATO?";
                } else {
                    opponentStep.classList.add("hidden");
                    opponentCap = null;
                }
            };

            const updateConfirm = () => {
                const ok = shotType && outcome && (!needsOpponent() || opponentCap) && zone;
                confirmBtn.disabled = !ok;
            };

            dlg.querySelectorAll("[data-shottype] .sd-opt").forEach((btn) => {
                btn.addEventListener("click", () => {
                    shotType = btn.dataset.value;
                    dlg.querySelectorAll("[data-shottype] .sd-opt").forEach(b =>
                        b.classList.toggle("selected", b === btn));
                    updateConfirm();
                });
            });

            dlg.querySelectorAll("[data-outcome] .sd-opt").forEach((btn) => {
                btn.addEventListener("click", () => {
                    outcome = btn.dataset.value;
                    dlg.querySelectorAll("[data-outcome] .sd-opt").forEach(b =>
                        b.classList.toggle("selected", b === btn));
                    updateOpponentVisibility();
                    updateConfirm();
                });
            });

            dlg.querySelectorAll("[data-opponent] .sd-opt").forEach((btn) => {
                btn.addEventListener("click", () => {
                    opponentCap = btn.dataset.value;
                    dlg.querySelectorAll("[data-opponent] .sd-opt").forEach(b =>
                        b.classList.toggle("selected", b === btn));
                    updateConfirm();
                });
            });

            dlg.querySelectorAll("[data-zone] .sd-zone").forEach((btn) => {
                btn.addEventListener("click", () => {
                    zone = btn.dataset.value;
                    dlg.querySelectorAll("[data-zone] .sd-zone").forEach(b =>
                        b.classList.toggle("selected", b === btn));
                    updateConfirm();
                });
            });

            dlg.querySelector("[data-cancel]").addEventListener("click", () => {
                this._close(dlg, resolve, null);
            });

            dlg.querySelector("[data-confirm]").addEventListener("click", () => {
                this._close(dlg, resolve, {
                    shotType,
                    outcome,
                    opponentCap: needsOpponent() ? opponentCap : undefined,
                    zone
                });
            });

            dlg.showModal();
        });
    },

    _close(dlg, resolve, value) {
        dlg.close();
        dlg.remove();
        resolve(value);
    },

    _opponentButtons(game, oppTeam) {
        const roster = (oppTeam === "W" ? game?.white?.roster : game?.dark?.roster) || {};

        const players = Object.entries(roster)
            .filter(([cap, p]) => cap !== "HC" && cap !== "AC" && cap !== "B" && p)
            .map(([cap, p]) => ({ cap: String(cap), name: p.name || `#${cap}` }))
            .sort((a, b) => {
                const na = parseInt(a.cap, 10);
                const nb = parseInt(b.cap, 10);
                if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
                return a.cap.localeCompare(b.cap);
            });

        if (!players.length) {
            return `<div class="sd-empty">Nessun giocatore nel roster avversario.</div>`;
        }

        return players.map(p => `
            <button type="button" class="sd-opt" data-value="${this._esc(p.cap)}">
                <b>#${this._esc(p.cap)}</b>
                <span>${this._esc(p.name)}</span>
            </button>
        `).join("");
    },

    _esc(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    },

    _installStyles() {
        if (document.getElementById("wplog-shotdetails-styles")) return;

        const style = document.createElement("style");
        style.id = "wplog-shotdetails-styles";
        style.textContent = `
            .shotdetails-dialog-wrap {
                border: 0;
                border-radius: 14px;
                padding: 0;
                max-width: 560px;
                width: calc(100% - 24px);
                background: var(--surface-color,#151515);
                color: inherit;
            }
            .shotdetails-dialog-wrap::backdrop {
                background: rgba(0,0,0,.6);
            }
            .shotdetails-dialog {
                padding: 18px;
                max-height: 85vh;
                overflow-y: auto;
            }
            .shotdetails-dialog h2 {
                margin: 0 0 10px;
            }
            .sd-step {
                margin-top: 14px;
            }
            .sd-step.hidden {
                display: none;
            }
            .sd-label {
                font-size: .75rem;
                font-weight: 800;
                opacity: .7;
                margin-bottom: 6px;
            }
            .sd-grid {
                display: grid;
                grid-template-columns: repeat(5,minmax(0,1fr));
                gap: 6px;
            }
            .sd-grid-shottype {
                grid-template-columns: repeat(3,minmax(0,1fr));
            }
            .sd-grid-opponent {
                grid-template-columns: repeat(2,minmax(0,1fr));
                max-height: 40vh;
                overflow: auto;
            }
            .sd-opt {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                text-align: center;
                padding: 10px 6px;
                border: 1px solid var(--border-color,#555);
                border-radius: 8px;
                background: transparent;
                color: inherit;
                font-weight: 700;
            }
            .sd-grid-opponent .sd-opt {
                flex-direction: row;
                justify-content: flex-start;
                text-align: left;
                gap: 7px;
            }
            .sd-opt.selected {
                outline: 2px solid var(--accent-color,#0a84ff);
                background: rgba(10,132,255,.15);
            }
            .sd-empty {
                opacity: .65;
                font-size: .85rem;
                padding: 10px 0;
            }

            /* Goal zone diagram */
            .sd-goal {
                display: grid;
                grid-template-columns: 0.8fr 1fr 1fr 1fr 0.8fr;
                grid-template-rows: 0.7fr 1fr 1fr;
                gap: 5px;
                aspect-ratio: 5 / 3;
                background: rgba(127,127,127,.08);
                border: 2px solid var(--border-color,#666);
                border-radius: 10px;
                padding: 6px;
            }
            .sd-zone {
                border: 1px solid var(--border-color,#555);
                border-radius: 6px;
                background: transparent;
                color: inherit;
                font-weight: 800;
                font-size: .72rem;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                line-height: 1.1;
                padding: 2px;
            }
            .sd-zone.selected {
                outline: 2px solid var(--accent-color,#0a84ff);
                background: rgba(10,132,255,.2);
            }
            .sd-zone-wt {
                grid-column: 1 / -1;
                grid-row: 1;
                background: rgba(255,255,255,.04);
                border-style: dashed;
            }
            .sd-zone-wl {
                grid-column: 1;
                grid-row: 2 / span 2;
                background: rgba(255,255,255,.04);
                border-style: dashed;
            }
            .sd-zone-wr {
                grid-column: 5;
                grid-row: 2 / span 2;
                background: rgba(255,255,255,.04);
                border-style: dashed;
            }
            .sd-zone-tl { grid-column: 2; grid-row: 2; }
            .sd-zone-tc { grid-column: 3; grid-row: 2; }
            .sd-zone-tr { grid-column: 4; grid-row: 2; }
            .sd-zone-bl { grid-column: 2; grid-row: 3; }
            .sd-zone-bc { grid-column: 3; grid-row: 3; }
            .sd-zone-br { grid-column: 4; grid-row: 3; }

            .shotdetails-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 16px;
            }
            .shotdetails-actions button {
                border: 1px solid var(--border-color,#555);
                border-radius: 8px;
                padding: 8px 12px;
                background: var(--button-bg,#222);
                color: inherit;
                font-weight: 700;
            }
            .shotdetails-actions .primary {
                background: var(--accent-color,#0a84ff);
                color: #fff;
                border-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }
};

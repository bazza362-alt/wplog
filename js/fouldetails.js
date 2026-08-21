/**
 * wplog — Foul Details
 *
 * Second-step dialog for Exclusion and Penalty events: the opposing
 * player who caused/earned it, and (for Exclusion) the type.
 */

export const FoulDetails = {

    EXCLUSION_TYPES: [
        { code: "EC", label: "EC — Espulsione al centro" },
        { code: "EF", label: "EF — Espulsione campo" }
    ],

    /**
     * Opens the foul-details dialog.
     * Resolves with { exclusionType, opponentCap } (exclusionType only for
     * Exclusion) or null if cancelled.
     *
     * @param {object} game - current game object
     * @param {string} team - the team of the player committing the foul, "W" or "D"
     * @param {string} eventCode - "E" (Exclusion) or "P" (Penalty)
     */
    prompt(game, team, eventCode) {
        return new Promise((resolve) => {

            this._installStyles();

            const isExclusion = eventCode === "E";
            const oppTeam = team === "W" ? "D" : "W";

            const dlg = document.createElement("dialog");
            dlg.className = "fouldetails-dialog-wrap";

            dlg.innerHTML = `
                <div class="fouldetails-dialog">

                    <h2>${isExclusion ? "Dettagli espulsione" : "Dettagli rigore"}</h2>

                    ${isExclusion ? `
                        <div class="fd-step">
                            <div class="fd-label">1. TIPO DI ESPULSIONE</div>
                            <div class="fd-grid fd-grid-type" data-exclusiontype>
                                ${this.EXCLUSION_TYPES.map(t => `
                                    <button type="button" class="fd-opt" data-value="${t.code}">${t.label}</button>
                                `).join("")}
                            </div>
                        </div>
                    ` : ""}

                    <div class="fd-step">
                        <div class="fd-label">${isExclusion ? "2. CHI L'HA CAUSATA?" : "1. CHI L'HA GUADAGNATO?"}</div>
                        <div class="fd-grid fd-grid-opponent" data-opponent>
                            ${this._opponentButtons(game, oppTeam)}
                        </div>
                    </div>

                    <div class="fouldetails-actions">
                        <button type="button" data-cancel>Annulla</button>
                        <button type="button" class="primary" data-confirm disabled>CONFERMA</button>
                    </div>

                </div>
            `;

            dlg.addEventListener("click", (e) => {
                if (e.target === dlg) this._close(dlg, resolve, null);
            });

            document.body.appendChild(dlg);

            let exclusionType = null;
            let opponentCap = null;

            const confirmBtn = dlg.querySelector("[data-confirm]");

            const updateConfirm = () => {
                const ok = (!isExclusion || exclusionType) && opponentCap;
                confirmBtn.disabled = !ok;
            };

            if (isExclusion) {
                dlg.querySelectorAll("[data-exclusiontype] .fd-opt").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        exclusionType = btn.dataset.value;
                        dlg.querySelectorAll("[data-exclusiontype] .fd-opt").forEach(b =>
                            b.classList.toggle("selected", b === btn));
                        updateConfirm();
                    });
                });
            }

            dlg.querySelectorAll("[data-opponent] .fd-opt").forEach((btn) => {
                btn.addEventListener("click", () => {
                    opponentCap = btn.dataset.value;
                    dlg.querySelectorAll("[data-opponent] .fd-opt").forEach(b =>
                        b.classList.toggle("selected", b === btn));
                    updateConfirm();
                });
            });

            dlg.querySelector("[data-cancel]").addEventListener("click", () => {
                this._close(dlg, resolve, null);
            });

            dlg.querySelector("[data-confirm]").addEventListener("click", () => {
                this._close(dlg, resolve, {
                    exclusionType: isExclusion ? exclusionType : undefined,
                    opponentCap
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
            return `<div class="fd-empty">Nessun giocatore nel roster avversario.</div>`;
        }

        return players.map(p => `
            <button type="button" class="fd-opt" data-value="${this._esc(p.cap)}">
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
        if (document.getElementById("wplog-fouldetails-styles")) return;

        const style = document.createElement("style");
        style.id = "wplog-fouldetails-styles";
        style.textContent = `
            .fouldetails-dialog-wrap {
                border: 0;
                border-radius: 14px;
                padding: 0;
                max-width: 560px;
                width: calc(100% - 24px);
                background: var(--surface-color,#151515);
                color: inherit;
            }
            .fouldetails-dialog-wrap::backdrop {
                background: rgba(0,0,0,.6);
            }
            .fouldetails-dialog {
                padding: 18px;
            }
            .fouldetails-dialog h2 {
                margin: 0 0 10px;
            }
            .fd-step {
                margin-top: 14px;
            }
            .fd-label {
                font-size: .75rem;
                font-weight: 800;
                opacity: .7;
                margin-bottom: 6px;
            }
            .fd-grid {
                display: grid;
                gap: 6px;
            }
            .fd-grid-type {
                grid-template-columns: repeat(2,minmax(0,1fr));
            }
            .fd-grid-opponent {
                grid-template-columns: repeat(2,minmax(0,1fr));
                max-height: 40vh;
                overflow: auto;
            }
            .fd-opt {
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
            .fd-grid-opponent .fd-opt {
                flex-direction: row;
                justify-content: flex-start;
                text-align: left;
                gap: 7px;
            }
            .fd-opt.selected {
                outline: 2px solid var(--accent-color,#0a84ff);
                background: rgba(10,132,255,.15);
            }
            .fd-empty {
                opacity: .65;
                font-size: .85rem;
                padding: 10px 0;
            }
            .fouldetails-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 16px;
            }
            .fouldetails-actions button {
                border: 1px solid var(--border-color,#555);
                border-radius: 8px;
                padding: 8px 12px;
                background: var(--button-bg,#222);
                color: inherit;
                font-weight: 700;
            }
            .fouldetails-actions .primary {
                background: var(--accent-color,#0a84ff);
                color: #fff;
                border-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }
};

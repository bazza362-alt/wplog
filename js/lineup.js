/**
 * wplog — Live Lineup & Substitutions
 *
 * Gestione dei 7 giocatori in acqua e dei cambi.
 */

import { Storage } from "./storage.js";
import { ClockEngine } from "./clock.js";

export const Lineup = {
    game: null,
    root: null,
    _observer: null,
    _timer: null,

    init() {
        this.root = document.getElementById("lineup-root");
        if (!this.root) return;

        this._installStyles();

        const liveScreen = document.getElementById("screen-live");

        if (liveScreen) {
            this._observer = new MutationObserver(() => this.render());

            this._observer.observe(liveScreen, {
                attributes: true,
                attributeFilter: ["class"]
            });
        }

        this._timer = setInterval(() => this.render(), 1000);

        this.render();
    },

    setGame(game) {
        this.game = game;
        this.render();
    },

    _getTeam(team) {
        return team === "W" ? this.game?.white : this.game?.dark;
    },

    _getRoster(team) {
        const t = this._getTeam(team);

        return t?.roster && typeof t.roster === "object"
            ? t.roster
            : {};
    },

    _ensureState(team) {
        const t = this._getTeam(team);

        if (!t) return null;

        if (!Array.isArray(t.lineup)) {
            t.lineup = [];
        }

        if (!Array.isArray(this.game.substitutions)) {
            this.game.substitutions = [];
        }

        return t;
    },

    _players(team) {
        const roster = this._getRoster(team);

        return Object.entries(roster)
            .filter(([cap, p]) =>
                cap !== "HC" &&
                cap !== "AC" &&
                cap !== "B" &&
                p
            )
            .map(([cap, p]) => ({
                cap: String(cap),
                name: p.name || `#${cap}`
            }))
            .sort((a, b) => {
                const na = parseInt(a.cap, 10);
                const nb = parseInt(b.cap, 10);

                if (!Number.isNaN(na) && !Number.isNaN(nb)) {
                    return na - nb;
                }

                return a.cap.localeCompare(b.cap);
            });
    },

    _player(team, cap) {
        return this._players(team).find(
            p => p.cap === String(cap)
        ) || {
            cap: String(cap),
            name: `#${cap}`
        };
    },

    _save() {
        if (!this.game) return;

        Storage.save(this.game);
    },

    _time() {
        const sec = ClockEngine.getSeconds();

        return sec == null ? null : sec;
    },

    _period() {
        return ClockEngine.getPeriod()
            || this.game?.currentPeriod
            || 1;
    },

    _teamLabel(team) {
        const t = this._getTeam(team);

        return team === "W"
            ? (t?.name || "White")
            : (t?.name || "Dark");
    },

    render() {
        if (!this.root) return;

        if (window.__wplogGame) {
            this.game = window.__wplogGame;
        }

        if (!this.game) {
            this.root.innerHTML = "";
            return;
        }

        this._ensureState("W");
        this._ensureState("D");

        const live = document.getElementById("screen-live");

        const active = live
            ? live.classList.contains("active")
            : true;

        if (!active) return;

        this.root.innerHTML = `
            <section class="lineup-panel">

                <div class="lineup-heading">

                    <div>
                        <div class="lineup-title">
                            Giocatori in acqua
                        </div>

                        <div class="lineup-subtitle">
                            7 attivi per squadra
                        </div>
                    </div>

                    <button
                        type="button"
                        class="lineup-history-btn"
                        data-action="history">
                        CAMBI
                    </button>

                </div>

                <div class="lineup-columns">

                    ${this._teamHTML("W")}

                    ${this._teamHTML("D")}

                </div>

            </section>
        `;

        this.root
            .querySelectorAll("[data-action='setup']")
            .forEach(btn => {

                btn.addEventListener(
                    "click",
                    () => this._openSetup(btn.dataset.team)
                );

            });

        this.root
            .querySelectorAll("[data-action='sub']")
            .forEach(btn => {

                btn.addEventListener(
                    "click",
                    () => this._openSubstitution(btn.dataset.team)
                );

            });

        const hist =
            this.root.querySelector(
                "[data-action='history']"
            );

        if (hist) {
            hist.addEventListener(
                "click",
                () => this._openHistory()
            );
        }
    },

    _teamHTML(team) {

        const t = this._ensureState(team);

        const lineup = t?.lineup || [];

        const players = lineup.map(
            cap => this._player(team, cap)
        );

        const rows = players.length

            ? players.map((p, i) => `

                <div class="lineup-player">

                    <span class="lineup-cap">
                        ${this._esc(p.cap)}
                    </span>

                    <span class="lineup-name">
                        ${this._esc(p.name)}
                    </span>

                    <span class="lineup-pos">
                        ${i + 1}
                    </span>

                </div>

            `).join("")

            : `
                <div class="lineup-empty">
                    Formazione iniziale non impostata
                </div>
            `;

        const action = lineup.length === 7

            ? `
                <button
                    type="button"
                    class="lineup-action"
                    data-action="sub"
                    data-team="${team}">
                    CAMBIO
                </button>
            `

            : `
                <button
                    type="button"
                    class="lineup-action primary"
                    data-action="setup"
                    data-team="${team}">
                    SELEZIONA 7
                </button>
            `;

        return `

            <div class="lineup-team
                lineup-${team === "W" ? "white" : "dark"}">

                <div class="lineup-team-header">

                    <strong>
                        ${this._esc(
                            this._teamLabel(team)
                        )}
                    </strong>

                    <span>
                        ${lineup.length}/7
                    </span>

                </div>

                <div class="lineup-list">
                    ${rows}
                </div>

                ${action}

            </div>
        `;
    },

    _openSetup(team) {

        const players = this._players(team);

        const t = this._ensureState(team);

        const selected = new Set(
            t.lineup || []
        );

        if (players.length < 7) {

            this._alert(
                `La squadra ${this._teamLabel(team)}
                 ha meno di 7 giocatori nel roster.`
            );

            return;
        }

        const dlg = this._dialog(`

            <div class="lineup-dialog">

                <h2>
                    Formazione iniziale —
                    ${this._esc(
                        this._teamLabel(team)
                    )}
                </h2>

                <p class="lineup-dialog-help">
                    Seleziona esattamente 7 giocatori.
                </p>

                <div
                    class="lineup-count"
                    data-count>
                    ${selected.size}/7
                </div>

                <div class="lineup-select-list">

                    ${players.map(p => `

                        <label class="lineup-select-row">

                            <input
                                type="checkbox"
                                value="${this._esc(p.cap)}"
                                ${selected.has(p.cap)
                                    ? "checked"
                                    : ""}>

                            <span class="lineup-select-cap">
                                #${this._esc(p.cap)}
                            </span>

                            <span>
                                ${this._esc(p.name)}
                            </span>

                        </label>

                    `).join("")}

                </div>

                <div class="lineup-dialog-actions">

                    <button
                        type="button"
                        data-cancel>
                        Annulla
                    </button>

                    <button
                        type="button"
                        class="primary"
                        data-save>
                        Conferma 7
                    </button>

                </div>

            </div>

        `);

        const updateCount = () => {

            const checked =
                [...dlg.querySelectorAll(
                    "input:checked"
                )];

            dlg.querySelector(
                "[data-count]"
            ).textContent =
                `${checked.length}/7`;

            dlg.querySelector(
                "[data-save]"
            ).disabled =
                checked.length !== 7;
        };

        dlg.querySelectorAll("input")
            .forEach(input => {

                input.addEventListener(
                    "change",
                    () => {

                        const checked =
                            dlg.querySelectorAll(
                                "input:checked"
                            );

                        if (checked.length > 7) {
                            input.checked = false;
                        }

                        updateCount();
                    }
                );

            });

        dlg.querySelector(
            "[data-cancel]"
        ).addEventListener(
            "click",
            () => dlg.close()
        );

        dlg.querySelector(
            "[data-save]"
        ).addEventListener(
            "click",
            () => {

                const caps =
                    [...dlg.querySelectorAll(
                        "input:checked"
                    )].map(
                        i => i.value
                    );

                if (caps.length !== 7) {
                    return;
                }

                t.lineup = caps;

                this._save();

                dlg.close();

                this.render();
            }
        );

        updateCount();

        dlg.showModal();
    },

    _openSubstitution(team) {

        const t = this._ensureState(team);

        if (!t || t.lineup.length !== 7) {

            this._openSetup(team);

            return;
        }

        const bench =
            this._players(team)
                .filter(
                    p => !t.lineup.includes(p.cap)
                );

        if (!bench.length) {

            this._alert(
                "Non ci sono giocatori in panchina disponibili."
            );

            return;
        }

        const dlg = this._dialog(`

            <div class="lineup-dialog">

                <h2>
                    Cambio —
                    ${this._esc(
                        this._teamLabel(team)
                    )}
                </h2>

                <div class="sub-step">

                    <div class="sub-label">
                        1. ESCE
                    </div>

                    <div class="sub-grid" data-out>

                        ${t.lineup.map(cap => {

                            const p =
                                this._player(
                                    team,
                                    cap
                                );

                            return `

                                <button
                                    type="button"
                                    class="sub-player"
                                    data-cap="${this._esc(cap)}">

                                    <b>
                                        #${this._esc(p.cap)}
                                    </b>

                                    <span>
                                        ${this._esc(p.name)}
                                    </span>

                                </button>
                            `;

                        }).join("")}

                    </div>

                </div>

                <div class="sub-step">

                    <div class="sub-label">
                        2. ENTRA
                    </div>

                    <div class="sub-grid" data-in>

                        ${bench.map(p => `

                            <button
                                type="button"
                                class="sub-player"
                                data-cap="${this._esc(p.cap)}">

                                <b>
                                    #${this._esc(p.cap)}
                                </b>

                                <span>
                                    ${this._esc(p.name)}
                                </span>

                            </button>

                        `).join("")}

                    </div>

                </div>

                <div
                    class="sub-summary"
                    data-summary>

                    Seleziona un giocatore
                    che esce e uno che entra.

                </div>

                <div class="sub-time-row">

                    <label for="sub-time-input">
                        Minuto del cambio
                    </label>

                    <input
                        type="text"
                        id="sub-time-input"
                        data-time
                        inputmode="numeric"
                        placeholder="MM:SS"
                        value="${
                            this._time() != null
                                ? this._formatTime(this._time())
                                : ""
                        }">

                </div>

                <div class="lineup-dialog-actions">

                    <button
                        type="button"
                        data-cancel>
                        Annulla
                    </button>

                    <button
                        type="button"
                        class="primary"
                        data-confirm
                        disabled>

                        CONFERMA CAMBIO

                    </button>

                </div>

            </div>

        `);

        let outCap = null;

        let inCap = null;

        const summary =
            dlg.querySelector(
                "[data-summary]"
            );

        const confirm =
            dlg.querySelector(
                "[data-confirm]"
            );

        const update = () => {

            dlg.querySelectorAll(
                "[data-out] .sub-player"
            ).forEach(b => {

                b.classList.toggle(
                    "selected",
                    b.dataset.cap === outCap
                );

            });

            dlg.querySelectorAll(
                "[data-in] .sub-player"
            ).forEach(b => {

                b.classList.toggle(
                    "selected",
                    b.dataset.cap === inCap
                );

            });

            const outP =
                outCap
                    ? this._player(
                        team,
                        outCap
                    )
                    : null;

            const inP =
                inCap
                    ? this._player(
                        team,
                        inCap
                    )
                    : null;

            summary.textContent =
                outP && inP

                    ? `Cambio: #${outP.cap}
                       ${outP.name} →
                       #${inP.cap}
                       ${inP.name}`

                    : "Seleziona un giocatore che esce e uno che entra.";

            confirm.disabled =
                !(outCap && inCap);
        };

        dlg.querySelectorAll(
            "[data-out] .sub-player"
        ).forEach(b => {

            b.addEventListener(
                "click",
                () => {

                    outCap =
                        b.dataset.cap;

                    update();
                }
            );

        });

        dlg.querySelectorAll(
            "[data-in] .sub-player"
        ).forEach(b => {

            b.addEventListener(
                "click",
                () => {

                    inCap =
                        b.dataset.cap;

                    update();
                }
            );

        });

        dlg.querySelector(
            "[data-cancel]"
        ).addEventListener(
            "click",
            () => dlg.close()
        );

        dlg.querySelector(
            "[data-confirm]"
        ).addEventListener(
            "click",
            () => {

                const timeInput =
                    dlg.querySelector("[data-time]");

                const manual =
                    timeInput
                        ? this._parseTime(timeInput.value)
                        : null;

                const now =
                    manual != null
                        ? manual
                        : this._time();

                const period =
                    this._period();

                t.lineup =
                    t.lineup.map(
                        cap =>
                            cap === outCap
                                ? inCap
                                : cap
                    );

                if (!Array.isArray(
                    this.game.substitutions
                )) {
                    this.game.substitutions = [];
                }

                this.game.substitutions.push({

                    id: Date.now(),

                    period,

                    time: now,

                    team,

                    out: String(outCap),

                    in: String(inCap)

                });

                this._save();

                dlg.close();

                this.render();
            }
        );

        dlg.showModal();
    },

    _openHistory() {

        const subs =
            Array.isArray(
                this.game?.substitutions
            )
                ? this.game.substitutions
                : [];

        const ordered =
            [...subs].reverse();

        const rows =
            ordered.length

                ? ordered.map(s => {

                    const outP =
                        this._player(
                            s.team,
                            s.out
                        );

                    const inP =
                        this._player(
                            s.team,
                            s.in
                        );

                    const time =
                        s.time == null
                            ? "--:--"
                            : this._formatTime(
                                s.time
                            );

                    return `

                        <div class="history-row">

                            <span>
                                Q${s.period}
                            </span>

                            <span>
                                ${time}
                            </span>

                            <span>
                                ${s.team === "W"
                                    ? "BIANCHI"
                                    : "NERI"}
                            </span>

                            <span>
                                #${this._esc(s.out)}
                                ${this._esc(outP.name)}
                                →
                                #${this._esc(s.in)}
                                ${this._esc(inP.name)}
                            </span>

                        </div>
                    `;

                }).join("")

                : `

                    <div class="lineup-empty">
                        Nessun cambio registrato.
                    </div>

                `;

        const dlg = this._dialog(`

            <div class="lineup-dialog">

                <h2>
                    Storico cambi
                </h2>

                <div class="history-table">

                    <div class="history-head">

                        <span>Periodo</span>
                        <span>Tempo</span>
                        <span>Squadra</span>
                        <span>Cambio</span>

                    </div>

                    ${rows}

                </div>

                <div class="lineup-dialog-actions">

                    <button
                        type="button"
                        class="primary"
                        data-cancel>
                        Chiudi
                    </button>

                </div>

            </div>

        `);

        dlg.querySelector(
            "[data-cancel]"
        ).addEventListener(
            "click",
            () => dlg.close()
        );

        dlg.showModal();
    },

    _dialog(html) {

        const dlg =
            document.createElement(
                "dialog"
            );

        dlg.className =
            "lineup-dialog-wrap";

        dlg.innerHTML = html;

        dlg.addEventListener(
            "click",
            e => {

                if (e.target === dlg) {
                    dlg.close();
                }

            }
        );

        document.body.appendChild(dlg);

        dlg.addEventListener(
            "close",
            () => dlg.remove(),
            { once: true }
        );

        return dlg;
    },

    _alert(message) {

        const dlg =
            this._dialog(`

                <div class="lineup-dialog">

                    <h2>
                        Gestione cambi
                    </h2>

                    <p>
                        ${this._esc(message)}
                    </p>

                    <div class="lineup-dialog-actions">

                        <button
                            type="button"
                            class="primary"
                            data-cancel>
                            OK
                        </button>

                    </div>

                </div>

            `);

        dlg.querySelector(
            "[data-cancel]"
        ).addEventListener(
            "click",
            () => dlg.close()
        );

        dlg.showModal();
    },

    _formatTime(seconds) {

        const s =
            Math.max(
                0,
                Number(seconds) || 0
            );

        return `${Math.floor(s / 60)}:${String(
            s % 60
        ).padStart(2, "0")}`;
    },

    _parseTime(value) {

        if (!value) return null;

        const parts = String(value).trim().split(":");

        if (parts.length !== 2) return null;

        const m = parseInt(parts[0], 10);
        const s = parseInt(parts[1], 10);

        if (Number.isNaN(m) || Number.isNaN(s)) return null;

        return (m * 60) + s;
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

        if (
            document.getElementById(
                "wplog-lineup-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "wplog-lineup-styles";

        style.textContent = `

            #lineup-root {
                margin: 12px 0;
            }

            .lineup-panel {
                border: 1px solid
                    var(--border-color,#444);

                border-radius: 12px;

                padding: 10px;

                background:
                    var(--surface-color,#111);
            }

            .lineup-heading {
                display: flex;

                align-items: center;

                justify-content: space-between;

                margin-bottom: 8px;
            }

            .lineup-title {
                font-weight: 700;
                font-size: 1rem;
            }

            .lineup-subtitle {
                font-size: .75rem;
                opacity: .65;
            }

            .lineup-history-btn,
            .lineup-action,
            .lineup-dialog-actions button {

                border: 1px solid
                    var(--border-color,#555);

                border-radius: 8px;

                padding: 8px 12px;

                background:
                    var(--button-bg,#222);

                color: inherit;

                font-weight: 700;
            }

            .lineup-columns {

                display: grid;

                grid-template-columns:
                    1fr 1fr;

                gap: 8px;
            }

            .lineup-team {

                border-radius: 10px;

                padding: 8px;

                background:
                    rgba(127,127,127,.08);
            }

            .lineup-team-header {

                display: flex;

                justify-content:
                    space-between;

                align-items: center;

                margin-bottom: 6px;
            }

            .lineup-list {

                display: grid;

                gap: 3px;
            }

            .lineup-player {

                display: grid;

                grid-template-columns:
                    32px 1fr 20px;

                align-items: center;

                min-height: 30px;

                padding: 3px 5px;

                border-radius: 6px;

                background:
                    rgba(127,127,127,.08);
            }

            .lineup-cap {
                font-weight: 800;
            }

            .lineup-pos {

                opacity: .45;

                font-size: .7rem;

                text-align: right;
            }

            .lineup-empty {

                text-align: center;

                padding: 18px 6px;

                opacity: .65;

                font-size: .85rem;
            }

            .lineup-action {

                width: 100%;

                margin-top: 7px;
            }

            .lineup-action.primary,
            .lineup-dialog-actions .primary {

                background:
                    var(--accent-color,#0a84ff);

                color: #fff;

                border-color: transparent;
            }

            .lineup-dialog-wrap {

                border: 0;

                border-radius: 14px;

                padding: 0;

                max-width: 560px;

                width:
                    calc(100% - 24px);

                background:
                    var(--surface-color,#151515);

                color: inherit;
            }

            .lineup-dialog-wrap::backdrop {

                background:
                    rgba(0,0,0,.6);
            }

            .lineup-dialog {
                padding: 18px;
            }

            .lineup-dialog h2 {
                margin: 0 0 6px;
            }

            .lineup-dialog-help {

                opacity: .7;

                margin: 0 0 8px;
            }

            .lineup-count {

                text-align: center;

                font-size: 1.3rem;

                font-weight: 800;

                margin: 8px 0;
            }

            .lineup-select-list {

                max-height: 55vh;

                overflow: auto;

                display: grid;

                gap: 5px;
            }

            .lineup-select-row {

                display: grid;

                grid-template-columns:
                    26px 45px 1fr;

                align-items: center;

                padding: 9px;

                border-radius: 8px;

                background:
                    rgba(127,127,127,.1);
            }

            .lineup-select-cap {
                font-weight: 800;
            }

            .lineup-dialog-actions {

                display: flex;

                justify-content: flex-end;

                gap: 8px;

                margin-top: 14px;
            }

            .sub-step {
                margin-top: 12px;
            }

            .sub-label {

                font-size: .75rem;

                font-weight: 800;

                opacity: .7;

                margin-bottom: 6px;
            }

            .sub-grid {

                display: grid;

                grid-template-columns:
                    repeat(2,minmax(0,1fr));

                gap: 6px;
            }

            .sub-player {

                display: flex;

                gap: 7px;

                align-items: center;

                text-align: left;

                padding: 9px;

                border: 1px solid
                    var(--border-color,#555);

                border-radius: 8px;

                background: transparent;

                color: inherit;
            }

            .sub-player span {

                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;
            }

            .sub-player.selected {

                outline: 2px solid
                    var(--accent-color,#0a84ff);

                background:
                    rgba(10,132,255,.15);
            }

            .sub-summary {

                margin-top: 12px;

                padding: 9px;

                border-radius: 8px;

                background:
                    rgba(127,127,127,.1);

                font-weight: 600;
            }

            .sub-time-row {

                margin-top: 10px;

                display: flex;

                align-items: center;

                gap: 8px;
            }

            .sub-time-row label {

                font-size: .8rem;

                font-weight: 700;

                opacity: .8;
            }

            .sub-time-row input {

                flex: 1;

                padding: 8px 10px;

                border-radius: 8px;

                border: 1px solid
                    var(--border-color,#555);

                background:
                    var(--surface-color,#111);

                color: inherit;

                font-size: 1rem;
            }

            .history-table {

                display: grid;

                gap: 2px;

                max-height: 55vh;

                overflow: auto;
            }

            .history-head,
            .history-row {

                display: grid;

                grid-template-columns:
                    55px 55px 75px 1fr;

                gap: 7px;

                align-items: center;

                padding: 7px 5px;
            }

            .history-head {

                font-size: .7rem;

                font-weight: 800;

                opacity: .65;

                border-bottom:
                    1px solid
                    var(--border-color,#555);
            }

            .history-row {

                font-size: .8rem;

                background:
                    rgba(127,127,127,.06);

                border-radius: 5px;
            }

            @media(max-width:520px) {

                .lineup-columns {
                    grid-template-columns: 1fr;
                }

                .history-head,
                .history-row {

                    grid-template-columns:
                        45px 50px 65px 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }
};

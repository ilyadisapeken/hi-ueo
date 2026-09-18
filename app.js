const GEMINI_MODEL = "gemini-3.1-flash-lite";

const STORAGE_KEY = "hi_ueo_agents";


function getAgentName() {

    const element =
        document.getElementById("agentName");

    return element?.value?.trim() ||
        "HI-UEO Agent";
}


async function runGemini(
    apiKey,
    instruction,
    task
) {

    const prompt = `
Kamu adalah AI Agent bernama "${getAgentName()}".

INSTRUKSI AGENT:
${instruction}

TUGAS PENGGUNA:
${task}

ATURAN:
1. Pahami instruksi agent.
2. Kerjakan tugas pengguna secara langsung.
3. Jangan menjelaskan proses internalmu.
4. Berikan hasil yang jelas dan terstruktur.
5. Gunakan bahasa Indonesia kecuali pengguna meminta bahasa lain.
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },

            body: JSON.stringify({

                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],

                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000
                }

            })
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        const message =
            data?.error?.message ||
            "Gemini API mengalami kesalahan.";

        throw new Error(message);
    }


    const text =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();


    if (!text) {

        throw new Error(
            "Gemini tidak menghasilkan jawaban."
        );
    }


    return text;
}


/* =========================
   RUN AGENT
========================= */

async function runAgent() {

    const apiKey =
        document.getElementById("apiKey")
            .value.trim();

    const name =
        document.getElementById("agentName")
            .value.trim();

    const instruction =
        document.getElementById("agentInstruction")
            .value.trim();

    const task =
        document.getElementById("agentTask")
            .value.trim();

    const result =
        document.getElementById("result");

    const statusText =
        document.getElementById("statusText");

    const button =
        document.getElementById("runButton");


    if (!apiKey) {

        result.innerText =
            "❌ Gemini API Key belum diisi.";

        statusText.innerText =
            "API Key diperlukan";

        return;
    }


    if (!name) {

        result.innerText =
            "❌ Nama Agent belum diisi.";

        statusText.innerText =
            "Nama agent diperlukan";

        return;
    }


    if (!instruction) {

        result.innerText =
            "❌ Instruksi Agent belum diisi.";

        statusText.innerText =
            "Instruksi diperlukan";

        return;
    }


    if (!task) {

        result.innerText =
            "❌ Tugas belum diisi.";

        statusText.innerText =
            "Tugas diperlukan";

        return;
    }


    button.disabled = true;

    button.innerText =
        "⏳ AGENT SEDANG BEKERJA...";

    statusText.innerText =
        "Agent sedang bekerja...";

    result.innerText =
        "🤖 HI-UEO sedang menghubungi Gemini...\n\n" +
        "Mohon tunggu.";


    try {

        const output =
            await runGemini(
                apiKey,
                instruction,
                task
            );


        result.innerText =
            "✅ AGENT SELESAI\n\n" +
            output;

        statusText.innerText =
            "Completed";


    } catch (error) {

        console.error(error);


        result.innerText =
            "❌ AGENT GAGAL\n\n" +
            error.message +
            "\n\n" +
            "Periksa API Key dan koneksi internet.";

        statusText.innerText =
            "Error";

    } finally {

        button.disabled = false;

        button.innerText =
            "▶ RUN AGENT";
    }
}


/* =========================
   SAVE AGENT
========================= */

function saveAgent() {

    const name =
        document.getElementById("agentName")
            .value.trim();

    const instruction =
        document.getElementById("agentInstruction")
            .value.trim();

    const task =
        document.getElementById("agentTask")
            .value.trim();

    const result =
        document.getElementById("result");

    const statusText =
        document.getElementById("statusText");


    if (!name) {

        result.innerText =
            "❌ Isi Nama Agent terlebih dahulu.";

        statusText.innerText =
            "Nama agent diperlukan";

        return;
    }


    if (!instruction) {

        result.innerText =
            "❌ Isi Instruksi Agent terlebih dahulu.";

        statusText.innerText =
            "Instruksi diperlukan";

        return;
    }


    let agents =
        getSavedAgents();


    const newAgent = {

        id:
            Date.now(),

        name:
            name,

        instruction:
            instruction,

        task:
            task,

        createdAt:
            new Date().toISOString()
    };


    agents.push(newAgent);


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(agents)
    );


    result.innerText =
        "✅ AGENT TERSIMPAN\n\n" +
        `"${name}" berhasil disimpan ke My Agents.`;

    statusText.innerText =
        "Agent Saved";


    renderAgents();
}


/* =========================
   GET SAVED AGENTS
========================= */

function getSavedAgents() {

    try {

        const data =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!data) {
            return [];
        }

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Gagal membaca agent:",
            error
        );

        return [];
    }
}


/* =========================
   DISPLAY AGENTS
========================= */

function renderAgents() {

    const agents =
        getSavedAgents();

    const container =
        document.getElementById(
            "agentsList"
        );

    const count =
        document.getElementById(
            "agentCount"
        );


    count.innerText =
        `${agents.length} Agent`;


    if (agents.length === 0) {

        container.innerHTML = `
            <div class="empty-agents">
                Belum ada agent yang disimpan.
            </div>
        `;

        return;
    }


    container.innerHTML =
        agents.map(agent => `

            <div class="agent-card">

                <h3>
                    🤖 ${escapeHtml(agent.name)}
                </h3>

                <p>
                    ${escapeHtml(
                        agent.instruction
                    )}
                </p>

                <div class="agent-card-buttons">

                    <button
                        class="open-agent"
                        onclick="openAgent(${agent.id})"
                    >
                        BUKA
                    </button>

                    <button
                        class="delete-agent"
                        onclick="deleteAgent(${agent.id})"
                    >
                        HAPUS
                    </button>

                </div>

            </div>

        `).join("");
}


/* =========================
   OPEN AGENT
========================= */

function openAgent(id) {

    const agents =
        getSavedAgents();

    const agent =
        agents.find(
            item => item.id === id
        );


    if (!agent) {
        return;
    }


    document.getElementById(
        "agentName"
    ).value =
        agent.name;


    document.getElementById(
        "agentInstruction"
    ).value =
        agent.instruction;


    document.getElementById(
        "agentTask"
    ).value =
        agent.task || "";


    document.getElementById(
        "result"
    ).innerText =
        `🤖 Agent "${agent.name}" berhasil dimuat.\n\n` +
        "Masukkan API Key jika diperlukan, lalu jalankan agent.";


    document.getElementById(
        "statusText"
    ).innerText =
        "Agent Loaded";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================
   DELETE AGENT
========================= */

function deleteAgent(id) {

    const agents =
        getSavedAgents();


    const agent =
        agents.find(
            item => item.id === id
        );


    if (!agent) {
        return;
    }


    const confirmDelete =
        confirm(
            `Hapus agent "${agent.name}"?`
        );


    if (!confirmDelete) {
        return;
    }


    const updatedAgents =
        agents.filter(
            item => item.id !== id
        );


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedAgents)
    );


    renderAgents();


    document.getElementById(
        "result"
    ).innerText =
        `🗑️ Agent "${agent.name}" telah dihapus.`;


    document.getElementById(
        "statusText"
    ).innerText =
        "Agent Deleted";
}


/* =========================
   SECURITY
========================= */

function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


/* =========================
   START APP
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderAgents();

    }
);

const GEMINI_MODEL = "gemini-3.1-flash-lite";

async function runGemini(apiKey, instruction, task) {

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

    const data = await response.json();

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


function getAgentName() {

    const element =
        document.getElementById("agentName");

    return element?.value?.trim() ||
        "HI-UEO Agent";
}


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

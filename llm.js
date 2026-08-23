async function getPageContent(url) {
    const response = await fetch(
        "https://r.jina.ai/" + url,
        {
            headers: {
                "X-Respond-With": "text"
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Jina: HTTP ${response.status}`);
    }

    return await response.text();
}

async function askLLM(prompt) {
    const response = await fetch(
        "https://api.llm7.io/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "codestral-latest",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Erreur LLM7 : ${response.status}`);
    }

    const data = await response.json();

    return data.choices[0].message.content;
}


let lien_chant = "https://eecpworship.fr/songs/04fb215e73d";
let paroles_brut = await getPageContent(lien_chant);
let paroles_txt = await askLLM("Renvoie un json et seulement un json, sans aucun commentaire. Il contiendra la clé \"strophes\" associée à une liste où chaque élément est une chaine de caractère qui correspond à une strophe/refrain/pont du chant présent dans le texte suivant : \n \n "+paroles_brut);
let paroles = JSON.parse(paroles_txt.replace(/^```json\s*/, '').replace(/\s*```$/, '')).strophes
console.log(paroles)
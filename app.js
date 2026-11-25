const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
let books = [];

function render() {
    const s = $("sort").value, yr = b => b.first_publish_year || 0;
    const rows = books
      .filter(b => !$("cover").checked || b.cover_i)
      .sort((a, b) => s === "new" ? yr(b) - yr(a)
        : s === "old" ? (yr(a) || 9999) - (yr(b) || 9999)
        : s === "title" ? a.title.localeCompare(b.title) : 0);
    $("msg").textContent = rows.length + " books";
    $("list").innerHTML = rows.map(b => `<div class="card">
        ${b.cover_i ? `<img src="https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg" alt="cover">` : ""}
        <b>${esc(b.title)}</b><span>${esc((b.author_name || ["Unknown"])[0])}</span>
        <span>Year: ${b.first_publish_year || "N/A"}</span></div>`).join("");
}

$("f").addEventListener("submit", e => {
    e.preventDefault();
    $("msg").textContent = "Loading.....";
    fetch("https://openlibrary.org/search.json?limit=40&fields=title,author_name,first_publish_year,cover_i&q=" + encodeURIComponent($("q").value))
      .then(r => { if (!r.ok) throw new Error("HTTP" + r.status); return r.json(); })
      .then(d => { books = d.docs; render(); })
      .catch(err => $("msg").textContent = "Could not load data: " + err.message);
});
["sort", "cover"].forEach(id => $(id).addEventListener("change", render));
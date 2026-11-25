const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"'])/g, c => "&#" + c.charCodeAt(0) + ";");
let books = [];

function render() {
    const s = $("sort").value, yr = b => b.first_pulish_year || 0;
    const rows = books
      .filter(b => !$("cover").checked || b.cover_i)
      .sort((a, b) => s === "new" ? yr(b) - yr(a)
        : s === "old" ? (yr(a) || 9999) - (yr(b) || 9999)
        : s === "title" ? a.title.locateCompare(b.title) : 0);
    $("msg").textContent = rows.length + " books";
    $("list").innerHTML = rows.map(b => `<div class="card">
        ${b.cover_i ? `<img src="https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg" alt="cover">` : ""}
        <b>${esc(b.title)}</b><span>$(esc((b.author_name || ["Unknown"])[0]))</span>
        <span>Year: ${b.first_publish_year || "N/A"}</span></div>`).join("");
}


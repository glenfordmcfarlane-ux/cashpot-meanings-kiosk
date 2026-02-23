  for (let i = 1; i <= config.total; i++){
    const b = document.createElement("button");
    b.className = "gridbtn";
    b.type = "button";
    b.textContent = pad2(i);
    b.addEventListener("click", () => openCard(i));
    grid.appendChild(b);
  }

  for (let i = 1; i <= config.total; i++){
    const b = document.createElement("button");
    b.className = "gridbtn";
    b.type = "button";
    b.addEventListener("click", () => openCard(i));

    const img = document.createElement("img");
    img.className = "gridbtn__img";
    img.alt = `Open meaning ${i}`;
    img.src = `${config.buttonsPath}/${config.buttonPrefix}${i}.${config.buttonExtension}`;

    b.appendChild(img);
    grid.appendChild(b);
  }

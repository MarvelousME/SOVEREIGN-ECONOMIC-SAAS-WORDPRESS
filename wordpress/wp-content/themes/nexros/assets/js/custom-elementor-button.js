document.addEventListener("DOMContentLoaded", function () {
    const observer = new MutationObserver((mutations) => {
        document.querySelectorAll(".elementor-editor-element-settings").forEach(addResetButton);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

function addResetButton(container) {
    if (container.querySelector(".reset-animation-btn")) return;

    const resetBtn = document.createElement("button");
    resetBtn.innerHTML = `<svg id="fi_10419335" viewBox="0 0 24 24" width="12" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m22 21c-.553 0-1-.448-1-1v-16c0-.552.447-1 1-1s1 .448 1 1v16c0 .552-.447 1-1 1zm-4 0c-.553 0-1-.448-1-1v-16c0-.552.447-1 1-1s1 .448 1 1v16c0 .552-.447 1-1 1zm-13.673-.271c-.509 0-1.023-.122-1.509-.367-1.139-.578-1.818-1.683-1.818-2.958v-10.807c0-1.275.679-2.381 1.817-2.958 1.119-.567 2.452-.457 3.46.285l7.368 5.402c.86.631 1.354 1.606 1.354 2.674s-.494 2.043-1.355 2.674l-7.368 5.403c-.588.432-1.265.651-1.949.651zm-.003-15.455c-.205 0-.408.05-.603.149-.458.232-.721.66-.721 1.174v10.807c0 .514.263.941.721 1.174.459.232.959.19 1.372-.112l7.369-5.404c.347-.254.538-.631.538-1.061s-.191-.807-.538-1.061l-7.368-5.404c-.233-.172-.5-.262-.77-.262z"></path></svg>`;
    resetBtn.className = "reset-animation-btn";
    resetBtn.style.cssText = `
        background: rgb(157, 165, 174);
        color: #000;
        border: none;
        padding: 2.1px 7px;
        cursor: pointer;
        z-index: 1000;
        font-size: 16px;
    `;

    container.appendChild(resetBtn);

    resetBtn.addEventListener("click", function () {
        const parentElement = container.closest(".elementor-element");
        if (parentElement) {
            if (parentElement.classList.contains('wow')) {
                resetAnimation(parentElement);
            }

            const childElements = parentElement.querySelectorAll('.wow, [class^="animate__"], [class*=" animate__"], .animated');
            childElements.forEach((child) => {
                const animationClasses = [...child.classList].filter(cls => cls.startsWith("animate__"));
                child.classList.remove("animated", "wow", ...animationClasses);
                child.style.animationName = "";
            });

            setTimeout(() => {
                childElements.forEach((child) => {
                    const animationClasses = [...child.classList].filter(cls => cls.startsWith("animate__"));
                    child.classList.add("wow", "animated", ...animationClasses);
                    child.style.visibility = "visible";
                    if (typeof WOW !== "undefined") {
                        new WOW().sync();
                    } else {
                        console.error("WOW.js không được tải. Vui lòng bao gồm thư viện này để kích hoạt hoạt ảnh.");
                    }
                });
            }, 50);
        }
    });
}

function resetAnimation(element) {

    const animationClasses = [...element.classList].filter(cls => cls.startsWith("animate__"));
    
    element.classList.remove("animated", "wow", ...animationClasses);
    element.style.animationName = ""; 
    element.style.visibility = "hidden"; 

    setTimeout(() => {
        element.classList.add("wow", "animated", ...animationClasses);
        element.style.visibility = "visible";

        if (typeof WOW !== "undefined") {
            new WOW().sync();
        } else {
            console.error("WOW.js không được tải. Vui lòng bao gồm thư viện này để kích hoạt hoạt ảnh.");
        }
    }, 50);
}
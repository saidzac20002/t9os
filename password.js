    const PASSWORD = "schoolgames2026";  // ← CHANGE THIS TO YOUR PASSWORD

    function grantAccess() {
      sessionStorage.setItem("school_hub_access", "yes");
      document.body.style.visibility = "visible";  // Reveal the page
    }

    function denyAccess() {
      document.body.innerHTML = `
        <div style="text-align:center; color:red; margin-top:100px; font-family:sans-serif; visibility: visible; font-size:3rem;">
          <h1>Access Denied</h1>
          <p>Wrong password. Please close this tab or ask for help.</p>
        </div>
      `;
      document.body.style.visibility = "hidden";  // Show the denial message
    }

    // Check if already authorized in this session
    if (sessionStorage.getItem("school_hub_access") === "yes") {
      grantAccess();
    } else {
      // Ask for password right away
      const entered = prompt("Enter the password to access the Game Hub:");

      if (entered === PASSWORD) {
        grantAccess();
      } else {
        alert("Wrong password!");
        denyAccess();
      }
    }

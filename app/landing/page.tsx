<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Roastly - The Budget Tracker That Roasts You</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0e0f11;
  --card:#15171a;
  --text:#f5f5f5;
  --muted:#a1a1aa;
  --yellow:#ffd400;
  --border:#23252a;
}

*{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:'Inter',sans-serif;
  background:var(--bg);
  color:var(--text);
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
}

.container{
  width:90%;
  max-width:1100px;
  margin:auto;
}

section{padding:80px 0;}

h1{
  font-size:clamp(2.5rem,6vw,4rem);
  font-weight:900;
  line-height:1.1;
}

h2{
  font-size:clamp(1.6rem,3vw,2.2rem);
  margin-bottom:20px;
}

p{color:var(--muted);}

.btn{
  display:inline-block;
  margin-top:25px;
  background:var(--yellow);
  color:#000;
  font-weight:700;
  padding:14px 28px;
  border-radius:8px;
  text-decoration:none;
  transition:.2s ease;
}
.btn:hover{transform:translateY(-3px);}

.hero{
  text-align:center;
  padding-top:100px;
  position:relative;
  overflow:hidden;
}

.subtext{
  margin-top:20px;
  font-size:1.2rem;
  max-width:600px;
  margin-left:auto;
  margin-right:auto;
}

.mockups{
  margin-top:60px;
  position:relative;
  display:flex;
  justify-content:center;
  align-items:center;
  gap:40px;
}

.device{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:20px;
  box-shadow:0 20px 60px rgba(0,0,0,0.5);
  overflow:hidden;
  animation:float 6s ease-in-out infinite;
}

.phone{
  width:220px;
  height:440px;
}

.laptop{
  width:500px;
  height:300px;
  animation-delay:2s;
}

.screen{
  padding:20px;
  font-size:0.9rem;
}

.roast{
  background:#1f2125;
  padding:10px;
  border-radius:10px;
  margin-top:10px;
  font-weight:600;
}

.reality{
  margin-top:10px;
  padding:10px;
  background:#1f2125;
  border-radius:10px;
}

.features{
  margin-top:60px;
}

.feature{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:40px;
  align-items:center;
  margin-bottom:80px;
}

.feature img{
  width:100%;
  border-radius:12px;
  border:1px solid var(--border);
  background:var(--card);
}

.feature-text h3{
  font-size:1.6rem;
  margin-bottom:15px;
}

.footer{
  text-align:center;
  padding:40px 0;
  border-top:1px solid var(--border);
  color:var(--muted);
}

@keyframes float{
  0%{transform:translateY(0px);}
  50%{transform:translateY(-15px);}
  100%{transform:translateY(0px);}
}

@media(max-width:900px){
  .feature{
    grid-template-columns:1fr;
  }
  .mockups{
    flex-direction:column;
  }
  .laptop{width:100%;height:220px;}
}
</style>
</head>
<body>

<section class="hero container">
  <h1>Roastly — The budget tracker that roasts you into saving money 💀</h1>
  <p class="subtext">Log expenses in 2 seconds and get savage honesty about your spending habits.</p>
  <a href="#" class="btn">Try Free</a>

  <div class="mockups">
    <div class="device phone">
      <div class="screen">
        <strong>Dashboard</strong>
        <div class="roast">You spent RM38 on bubble tea again? 💀</div>
        <div class="reality">If you do this weekly → RM1,976/year.</div>
      </div>
    </div>

    <div class="device laptop">
      <div class="screen">
        <strong>Reality Check Simulator</strong>
        <div class="roast">RM14 daily coffee = RM5,110/year.</div>
        <div class="reality">Invested at 8% for 5 years → RM7,500+</div>
      </div>
    </div>
  </div>
</section>

<section class="features container">
  <div class="feature">
    <div class="feature-text">
      <h3>Log fast → Get roasted → Move on</h3>
      <p>No spreadsheets. No categories hell. Just type the amount and let Roastly handle the brutal honesty.</p>
    </div>
    <img src="https://dummyimage.com/600x400/15171a/ffd400&text=Expense+Log+UI" alt="">
  </div>

  <div class="feature">
    <div class="feature-text">
      <h3>Reality Check before you buy</h3>
      <p>See the real yearly impact before tapping “Buy Now”. Future-you will thank you.</p>
    </div>
    <img src="https://dummyimage.com/600x400/15171a/ffd400&text=Reality+Simulator" alt="">
  </div>

  <div class="feature">
    <div class="feature-text">
      <h3>Brutal insights, zero fluff</h3>
      <p>We don’t sugarcoat. You overspent? We tell you. With numbers.</p>
    </div>
    <img src="https://dummyimage.com/600x400/15171a/ffd400&text=Savage+Analytics" alt="">
  </div>

  <div class="feature">
    <div class="feature-text">
      <h3>Minimal. Fast. Add to Home Screen.</h3>
      <p>Feels like an app. Opens instantly. No bloat. Just you and your financial reality.</p>
    </div>
    <img src="https://dummyimage.com/600x400/15171a/ffd400&text=Mobile+PWA+View" alt="">
  </div>
</section>

<section class="container" style="text-align:center;">
  <h2>Stop tracking. Start saving.</h2>
  <a href="#" class="btn">Add to Home Screen</a>
</section>

<div class="footer">
  © 2026 Roastly.my — Savage budgeting for serious results.
</div>

<script>
document.querySelectorAll('.btn').forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.preventDefault();
    alert("Roastly is coming soon. Get ready to be financially humbled 💀");
  });
});
</script>

</body>
</html>

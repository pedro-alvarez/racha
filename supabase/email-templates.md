# Racha. — Templates de e-mail (Supabase)

Cole cada bloco em **Authentication → Emails → (template correspondente)**.
Em cada template dá pra editar o **Subject** e o **Body (HTML)**.

> As variáveis entre `{{ }}` são do Supabase — não mude o nome delas.

---

## 1. Confirm sign up (confirmação de cadastro)

**Subject:** `Bora rachar? Confirma teu e-mail 💸`

```html
<div style="background:#0B0710;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#160A1C;border-radius:24px;padding:36px 28px;text-align:center;">
    <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0;">Racha<span style="color:#F0146B;">.</span></p>
    <p style="font-size:42px;margin:18px 0 0;">🎉</p>
    <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;">Falta só um toque!</h1>
    <p style="color:#B9B2C4;font-size:14px;line-height:1.6;margin:10px 0 0;">
      Sua conta no <strong style="color:#ffffff;">Racha.</strong> tá quase pronta.
      Confirma teu e-mail aí embaixo e já começa a dividir os gastos da galera
      sem stress (e sem calculadora).
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;margin-top:26px;background:#F0146B;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:16px;">
      Confirmar e-mail ✔
    </a>
    <p style="color:#9A93A8;font-size:12px;line-height:1.6;margin-top:26px;">
      Botão não funcionou? Copia e cola este link no navegador:<br>
      <span style="color:#FF2D7A;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>
  <p style="color:#5c5568;font-size:11px;text-align:center;margin-top:20px;">
    Não foi você? Relaxa e ignora — ninguém racha nada sem você 😉
  </p>
</div>
```

---

## 2. Invite user (convite)

**Subject:** `Te chamaram pro Racha. 💸 Bora?`

```html
<div style="background:#0B0710;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#160A1C;border-radius:24px;padding:36px 28px;text-align:center;">
    <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0;">Racha<span style="color:#F0146B;">.</span></p>
    <p style="font-size:42px;margin:18px 0 0;">🤝</p>
    <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;">Você foi convidado(a)!</h1>
    <p style="color:#B9B2C4;font-size:14px;line-height:1.6;margin:10px 0 0;">
      Alguém do teu grupo já tá usando o <strong style="color:#ffffff;">Racha.</strong>
      pra organizar viagens, rolês e — o principal — quem deve quanto pra quem.
      Cria tua conta e entra pro racha:
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;margin-top:26px;background:#F0146B;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:16px;">
      Criar minha conta 🚀
    </a>
    <p style="color:#9A93A8;font-size:12px;line-height:1.6;margin-top:26px;">
      Botão não funcionou? Copia e cola este link no navegador:<br>
      <span style="color:#FF2D7A;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>
  <p style="color:#5c5568;font-size:11px;text-align:center;margin-top:20px;">
    Não conhece ninguém que usa o Racha.? Então esse e-mail se perdeu — pode ignorar.
  </p>
</div>
```

---

## 3. Magic link or OTP (usado também pelos convites do app)

**Subject:** `Teu passe VIP pro Racha. chegou ✨`

```html
<div style="background:#0B0710;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#160A1C;border-radius:24px;padding:36px 28px;text-align:center;">
    <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0;">Racha<span style="color:#F0146B;">.</span></p>
    <p style="font-size:42px;margin:18px 0 0;">✨</p>
    <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;">Entra sem senha, sem drama</h1>
    <p style="color:#B9B2C4;font-size:14px;line-height:1.6;margin:10px 0 0;">
      Esse link te coloca direto no <strong style="color:#ffffff;">Racha.</strong> —
      a carteira compartilhada do teu grupo. Se é tua primeira vez, tua conta
      é criada na hora. Só tocar:
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;margin-top:26px;background:#F0146B;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:16px;">
      Entrar no Racha. 💸
    </a>
    <p style="color:#9A93A8;font-size:12px;line-height:1.6;margin-top:26px;">
      O link vale por pouco tempo e só funciona uma vez.<br>
      Botão não funcionou? Copia e cola:<br>
      <span style="color:#FF2D7A;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>
  <p style="color:#5c5568;font-size:11px;text-align:center;margin-top:20px;">
    Não pediu esse link? Ignora que tá tudo certo — sem clique, ninguém entra.
  </p>
</div>
```

---

## 4. Change email address (troca de e-mail)

**Subject:** `Trocando de e-mail? Confirma aqui 📮`

```html
<div style="background:#0B0710;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#160A1C;border-radius:24px;padding:36px 28px;text-align:center;">
    <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0;">Racha<span style="color:#F0146B;">.</span></p>
    <p style="font-size:42px;margin:18px 0 0;">📮</p>
    <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;">Mudança de endereço!</h1>
    <p style="color:#B9B2C4;font-size:14px;line-height:1.6;margin:10px 0 0;">
      Recebemos um pedido pra trocar o e-mail da tua conta no
      <strong style="color:#ffffff;">Racha.</strong> para
      <strong style="color:#FF2D7A;">{{ .NewEmail }}</strong>.
      Confirma aí embaixo pra valer:
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;margin-top:26px;background:#F0146B;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:16px;">
      Confirmar novo e-mail ✔
    </a>
    <p style="color:#9A93A8;font-size:12px;line-height:1.6;margin-top:26px;">
      Botão não funcionou? Copia e cola este link no navegador:<br>
      <span style="color:#FF2D7A;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>
  <p style="color:#5c5568;font-size:11px;text-align:center;margin-top:20px;">
    Não pediu essa troca? Ignora este e-mail e tua conta continua como está.
  </p>
</div>
```

---

## 5. Reset password (redefinir senha)

**Subject:** `Esqueceu a senha? Acontece 🔑`

```html
<div style="background:#0B0710;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#160A1C;border-radius:24px;padding:36px 28px;text-align:center;">
    <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0;">Racha<span style="color:#F0146B;">.</span></p>
    <p style="font-size:42px;margin:18px 0 0;">🔑</p>
    <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;">Bora criar uma senha nova</h1>
    <p style="color:#B9B2C4;font-size:14px;line-height:1.6;margin:10px 0 0;">
      Senha esquecida não pode te separar dos teus acertos de conta 😄
      Toca no botão e define uma nova:
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;margin-top:26px;background:#F0146B;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:16px;">
      Redefinir senha 🔓
    </a>
    <p style="color:#9A93A8;font-size:12px;line-height:1.6;margin-top:26px;">
      Botão não funcionou? Copia e cola este link no navegador:<br>
      <span style="color:#FF2D7A;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>
  <p style="color:#5c5568;font-size:11px;text-align:center;margin-top:20px;">
    Não pediu redefinição? Ignora este e-mail — tua senha atual segue firme e forte.
  </p>
</div>
```

---

## 6. Reauthentication (código de verificação)

**Subject:** `Teu código do Racha. 🔐`

```html
<div style="background:#0B0710;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#160A1C;border-radius:24px;padding:36px 28px;text-align:center;">
    <p style="font-size:28px;font-weight:800;color:#ffffff;margin:0;">Racha<span style="color:#F0146B;">.</span></p>
    <p style="font-size:42px;margin:18px 0 0;">🔐</p>
    <h1 style="color:#ffffff;font-size:22px;margin:16px 0 0;">Só confirmando que é você</h1>
    <p style="color:#B9B2C4;font-size:14px;line-height:1.6;margin:10px 0 0;">
      Essa operação é sensível, então precisamos de uma confirmação rapidinha.
      Teu código é:
    </p>
    <p style="margin:22px 0 0;">
      <span style="display:inline-block;background:#0B0710;border:1px solid #F0146B;color:#FF2D7A;font-size:28px;font-weight:800;letter-spacing:8px;padding:14px 26px;border-radius:16px;">{{ .Token }}</span>
    </p>
    <p style="color:#9A93A8;font-size:12px;line-height:1.6;margin-top:24px;">
      Digita esse código no app pra continuar. Ele expira logo, então corre 🏃
    </p>
  </div>
  <p style="color:#5c5568;font-size:11px;text-align:center;margin-top:20px;">
    Não foi você? Então não compartilha esse código com ninguém — nem com a tua mãe.
  </p>
</div>
```

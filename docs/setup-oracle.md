# Setup: Oracle Cloud Always Free box ($0/mo)

Gives you a 4-core ARM / 24GB Ubuntu box forever, free. The one real gotcha is ARM capacity (below).

## 0. SSH key (already generated for you)
Public key to paste into Oracle: the contents of `~/.ssh/agent-os-oracle.pub`
(private key stays on your machine at `~/.ssh/agent-os-oracle` - never share it).

## 1. Sign up
- Go to https://www.oracle.com/cloud/free/ -> Start for free. Needs email, phone, and a card for identity
  verification (Always Free is not charged; you can also set the account to never upgrade).
- IMPORTANT: your HOME REGION is permanent and decides ARM free-tier availability. If you get to pick, choose a
  less-busy region near you. Popular regions run out of free ARM capacity more often.

## 2. Create the instance
Console -> hamburger menu -> Compute -> Instances -> Create instance.
- Name: `agent-os`
- Image: Canonical **Ubuntu 24.04**
- Shape: click Change shape -> **Ampere** -> **VM.Standard.A1.Flex** -> set **4 OCPU / 24 GB** (all Always Free).
- Add SSH keys: choose "Paste public keys" and paste your `~/.ssh/agent-os-oracle.pub` contents.
- Networking: leave default (creates a VCN with a public IP; SSH port 22 is open in the default security list).
  We only need OUTBOUND for Telegram, so no extra ingress rules are required.
- Create.

### If you hit "Out of host capacity" (common on free ARM)
- Try a different Availability Domain (AD-1 / AD-2 / AD-3) in the create dialog.
- Try 2 OCPU / 12 GB (still plenty) if 4/24 won't place.
- Retry later, or over a few hours; free ARM frees up. Some people script a retry loop against the OCI CLI, but
  manual retry across ADs usually works within a day.

## 3. Connect
Note the instance's Public IP, then from your machine:
```bash
ssh -i ~/.ssh/agent-os-oracle ubuntu@<PUBLIC_IP>
```
(the default user on Oracle's Ubuntu image is `ubuntu`.)

Optional convenience - add to `~/.ssh/config` so you can just `ssh agent-os`:
```
Host agent-os
  HostName <PUBLIC_IP>
  User ubuntu
  IdentityFile ~/.ssh/agent-os-oracle
```

## 4. Bootstrap the box
On the box (agent-os is a PRIVATE repo, so authenticate first):
```bash
gh auth login                    # or: install gh, then login
git clone https://github.com/AlvaroBalbin/agent-os.git
bash agent-os/scripts/bootstrap-host.sh
```
This installs node/bun/gh/Claude Code, verifies the approval guard (must be all green), and wires the gate live.

## 5. Finish
- `claude login` (your Max account) -> `tmux new -s agent` -> follow `setup-telegram.md`.
- Optional cheap hands: `setup-routing.md`.

## Note on ARM
Oracle's free box is ARM64. Node, bun, git, and Claude Code all run on ARM64 fine. If any tool ships x86-only,
prefer its ARM build. Nothing in agent-os is architecture-specific (pure Node).

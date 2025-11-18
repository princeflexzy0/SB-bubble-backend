# Development & Audit Tools

This directory contains professional development, testing, and audit tools for the Bubble Backend API.

## 🔍 Audit Tools

### `audit-checklist.sh`
Comprehensive 74-point production readiness checker.

**Usage:**
```bash
./tools/audit-checklist.sh
```

**Checks:**
- All required files present
- Directory structure correct
- Configuration files valid
- Documentation complete

---

### `check-gitignore.sh`
Security and compliance validator.

**Usage:**
```bash
./tools/check-gitignore.sh
```

**Validates:**
- No `.env` file in repo
- No `node_modules` committed
- No log files tracked
- Proper `.gitignore` configuration

---

### `generate-tree.sh`
Repository structure analyzer with statistics.

**Usage:**
```bash
./tools/generate-tree.sh
```

**Generates:**
- Complete directory tree
- File count statistics
- Lines of code metrics
- Project overview

---

### `git-status-check.sh`
Git repository status verifier.

**Usage:**
```bash
./tools/git-status-check.sh
```

**Shows:**
- Current branch
- Uncommitted changes
- Remote status
- Recent commits

---

## 🧪 Testing Tools

### `verify-backend.sh`
Automated health and functionality checker.

**Usage:**
```bash
./tools/verify-backend.sh
```

**Tests:**
- Server is running
- Health endpoint responding
- API endpoints accessible
- Security middleware active

---

### `testing/test-frontend.html`
Interactive visual API testing interface.

**Usage:**
1. Start the server: `npm run dev`
2. Open `tools/testing/test-frontend.html` in browser
3. Click buttons to test endpoints
4. View JSON responses in real-time

**Features:**
- Visual endpoint testing
- Real-time response display
- No authentication required for demo
- Tests all major endpoints

---

## 📊 Quick Commands
```bash
# Run all audits
./tools/audit-checklist.sh && ./tools/check-gitignore.sh && ./tools/git-status-check.sh

# Generate project report
./tools/generate-tree.sh > PROJECT_STRUCTURE.txt

# Verify backend health
./tools/verify-backend.sh

# Full verification
./tools/audit-checklist.sh && ./tools/verify-backend.sh
```

---

## 🎯 Purpose

These tools ensure:
- ✅ Code quality standards maintained
- ✅ Repository stays clean
- ✅ All requirements met
- ✅ Production readiness verified
- ✅ Easy testing and validation

---

**Note:** All scripts are executable. If you get permission errors, run:
```bash
chmod +x tools/*.sh
```

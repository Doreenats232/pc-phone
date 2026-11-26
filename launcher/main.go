// PC Phone launcher: one exe that runs the phone server hidden, with a tray icon.
package main

import (
	_ "embed"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"fyne.io/systray"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

//go:embed icon.ico
var iconICO []byte

const (
	port     = "3000"
	runKey   = `Software\Microsoft\Windows\CurrentVersion\Run`
	noWindow = 0x08000000 // CREATE_NO_WINDOW
)

var (
	root    string
	dataDir string
	sysDir  string
	job     windows.Handle
	server  *exec.Cmd
	tunnel  *exec.Cmd
)

func main() {
	exe, err := os.Executable()
	if err != nil {
		os.Exit(1)
	}
	root = filepath.Dir(exe)
	dataDir = filepath.Join(root, "data")
	sysDir = filepath.Join(root, "system")
	_ = os.MkdirAll(dataDir, 0o755)

	// Only one launcher at a time: a second start just opens the connect page.
	name, _ := windows.UTF16PtrFromString("Local\\PCPhoneLauncher")
	if _, merr := windows.CreateMutex(nil, false, name); merr == windows.ERROR_ALREADY_EXISTS {
		openURL("http://localhost:" + port + "/connect")
		return
	}

	job = newJob()
	systray.Run(onReady, onExit)
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func messageBox(title, text string, flags uint32) int32 {
	t, _ := windows.UTF16PtrFromString(title)
	x, _ := windows.UTF16PtrFromString(text)
	r, _ := windows.MessageBox(0, x, t, flags)
	return r
}

// A job object makes Windows stop the server/tunnel if the launcher dies for any reason.
func newJob() windows.Handle {
	h, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return 0
	}
	var info windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION
	info.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
	_, err = windows.SetInformationJobObject(h, windows.JobObjectExtendedLimitInformation,
		uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info)))
	if err != nil {
		_ = windows.CloseHandle(h)
		return 0
	}
	return h
}

func addToJob(cmd *exec.Cmd) {
	if job == 0 || cmd.Process == nil {
		return
	}
	h, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(cmd.Process.Pid))
	if err != nil {
		return
	}
	_ = windows.AssignProcessToJobObject(job, h)
	_ = windows.CloseHandle(h)
}

func start(prog string, args []string, env []string, logPath string) (*exec.Cmd, error) {
	cmd := exec.Command(prog, args...)
	cmd.Dir = root
	cmd.Env = append(os.Environ(), env...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: noWindow}
	if logPath != "" {
		if f, err := os.Create(logPath); err == nil {
			cmd.Stdout = f
			cmd.Stderr = f
		}
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	addToJob(cmd)
	return cmd, nil
}

func healthy() bool {
	c := http.Client{Timeout: time.Second}
	r, err := c.Get("http://127.0.0.1:" + port + "/api/health")
	if err != nil {
		return false
	}
	defer r.Body.Close()
	return r.StatusCode == 200
}

func openURL(u string) {
	c := exec.Command("rundll32", "url.dll,FileProtocolHandler", u)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = c.Start()
}

func openFolder(p string) {
	_ = exec.Command("explorer", p).Start()
}

func autoStartOn() bool {
	k, err := registry.OpenKey(registry.CURRENT_USER, runKey, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer k.Close()
	_, _, err = k.GetStringValue("PCPhone")
	return err == nil
}

func setAutoStart(on bool) {
	k, err := registry.OpenKey(registry.CURRENT_USER, runKey, registry.SET_VALUE)
	if err != nil {
		return
	}
	defer k.Close()
	if on {
		exe, _ := os.Executable()
		_ = k.SetStringValue("PCPhone", `"`+exe+`"`)
	} else {
		_ = k.DeleteValue("PCPhone")
	}
}

// ---- away-from-home tunnel (cloudflared) ----

func tunnelLog() string { return filepath.Join(dataDir, "tunnel.log") }

func startTunnel() {
	if tunnel != nil {
		return
	}
	_ = os.Remove(tunnelLog())
	cmd, err := start(filepath.Join(sysDir, "cloudflared.exe"),
		[]string{"tunnel", "--no-autoupdate", "--url", "http://localhost:" + port, "--logfile", tunnelLog()}, nil, "")
	if err == nil {
		tunnel = cmd
	}
}

func stopTunnel() {
	if tunnel != nil && tunnel.Process != nil {
		_ = tunnel.Process.Kill()
		_, _ = tunnel.Process.Wait()
	}
	tunnel = nil
	_ = os.Remove(tunnelLog())
}

func saveChoice(yes bool) {
	v := "N"
	if yes {
		v = "Y"
	}
	_ = os.WriteFile(filepath.Join(dataDir, "remote.choice"), []byte(v), 0o644)
}

// Asks once, then remembers.
func awayChoice() bool {
	b, err := os.ReadFile(filepath.Join(dataDir, "remote.choice"))
	if err == nil {
		return strings.HasPrefix(strings.TrimSpace(string(b)), "Y")
	}
	yes := messageBox("PC Phone",
		"Use your phone from anywhere, not just home Wi-Fi?\n\nRemote access stays blocked until you set a PIN in the phone's Settings.",
		0x4|0x20) == 6 // MB_YESNO | MB_ICONQUESTION, IDYES
	saveChoice(yes)
	return yes
}

// ---- tray ----

func onReady() {
	systray.SetIcon(iconICO)
	systray.SetTitle("PC Phone")
	systray.SetTooltip("PC Phone is starting...")

	mQR := systray.AddMenuItem("Show phone QR / address", "Open the connect page")
	mData := systray.AddMenuItem("Open data folder", "Your phone's files, photos and backups")
	systray.AddSeparator()

	hasCF := fileExists(filepath.Join(sysDir, "cloudflared.exe"))
	var mAway *systray.MenuItem
	var awayCh chan struct{}
	if hasCF {
		mAway = systray.AddMenuItemCheckbox("Away-from-home access (needs PIN)", "Use your phone outside home Wi-Fi", false)
		awayCh = mAway.ClickedCh
	}
	mAuto := systray.AddMenuItemCheckbox("Start with Windows", "Run PC Phone when you sign in", autoStartOn())
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit PC Phone", "Turn the phone off")

	go boot(hasCF, mAway)

	go func() {
		for {
			select {
			case <-mQR.ClickedCh:
				openURL("http://localhost:" + port + "/connect")
			case <-mData.ClickedCh:
				openFolder(dataDir)
			case <-awayCh:
				if mAway.Checked() {
					mAway.Uncheck()
					stopTunnel()
					saveChoice(false)
				} else {
					mAway.Check()
					saveChoice(true)
					startTunnel()
				}
			case <-mAuto.ClickedCh:
				if mAuto.Checked() {
					mAuto.Uncheck()
					setAutoStart(false)
				} else {
					mAuto.Check()
					setAutoStart(true)
				}
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func boot(hasCF bool, mAway *systray.MenuItem) {
	if !healthy() {
		node := filepath.Join(sysDir, "node", "node.exe")
		if !fileExists(node) {
			node = "node"
		}
		cmd, err := start(node, []string{filepath.Join(sysDir, "server.js")},
			[]string{"PC_DATA_DIR=" + dataDir, "HOSTNAME=0.0.0.0", "PORT=" + port},
			filepath.Join(dataDir, "server.log"))
		if err != nil {
			messageBox("PC Phone", "Could not start the phone server:\n"+err.Error(), 0x10)
			return
		}
		server = cmd
	}
	for i := 0; i < 90 && !healthy(); i++ {
		time.Sleep(time.Second)
	}
	if !healthy() {
		messageBox("PC Phone", "The phone did not start. Details are in data\\server.log", 0x10)
		return
	}
	systray.SetTooltip("PC Phone is running")

	if hasCF && awayChoice() {
		mAway.Check()
		startTunnel()
	}

	first := filepath.Join(dataDir, ".first-run-done")
	if !fileExists(first) {
		_ = os.WriteFile(first, []byte("1"), 0o644)
		openURL("http://localhost:" + port + "/connect")
	}
}

func onExit() {
	stopTunnel()
	if server != nil && server.Process != nil {
		_ = server.Process.Kill()
	}
	if job != 0 {
		_ = windows.CloseHandle(job)
	}
}

/*
 * Windows delay-load hook for the Node-API addon.
 *
 * The addon delay-imports the Node-API symbols from "node.exe". This hook
 * intercepts that delay-load and binds the imports to the *host process*
 * image (GetModuleHandle(NULL)) instead of trying to locate a file named
 * node.exe. That makes a single binary work under node.exe, bun.exe,
 * electron.exe, etc., regardless of the host executable's name.
 *
 * cmake-js ships an equivalent hook but guards it with `#ifdef _MSC_VER`,
 * so it compiles to nothing under MinGW-w64 (which is the only supported
 * Windows toolchain for this project — abieos cannot be built with MSVC).
 * binutils' delayimp implements the MSVC-compatible __pfnDliNotifyHook2,
 * so the same approach works here once it is actually compiled in.
 */

#if defined(_MSC_VER) || defined(__MINGW32__)

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <windows.h>
#include <delayimp.h>
#include <string.h>

static HMODULE node_dll = NULL;
static HMODULE nw_dll = NULL;

static FARPROC WINAPI load_exe_hook(unsigned int event, DelayLoadInfo* info) {
  if (event == dliNotePreGetProcAddress) {
    FARPROC ret = NULL;
    if (node_dll) ret = GetProcAddress(node_dll, info->dlp.szProcName);
    if (ret) return ret;
    if (nw_dll) ret = GetProcAddress(nw_dll, info->dlp.szProcName);
    return ret;
  }
  if (event == dliStartProcessing) {
    // Electron / NW.js export Node-API from node.dll / nw.dll.
    node_dll = GetModuleHandleA("node.dll");
    nw_dll = GetModuleHandleA("nw.dll");
    return NULL;
  }
  if (event != dliNotePreLoadLibrary)
    return NULL;

  if (_stricmp(info->szDll, "node.exe") != 0 &&
      _stricmp(info->szDll, "iojs.exe") != 0)
    return NULL;

  // Bind the Node-API imports to the running host executable
  // (node.exe / bun.exe / electron.exe / ...).
  if (!node_dll) node_dll = GetModuleHandleA(NULL);

  return (FARPROC) node_dll;
}

extern "C" PfnDliHook __pfnDliNotifyHook2 = load_exe_hook;

#endif

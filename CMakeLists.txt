cmake_minimum_required (VERSION 3.22)
project(node_abieos VERSION 3.2.1 LANGUAGES CXX C)

# The vendored abieos C++ depends on libstdc++/libc++ standard-library
# semantics (e.g. std::string_view::iterator being a raw const char*) and
# GCC/Clang extensions (__int128, __builtin_unreachable). MSVC's STL/compiler
# provides none of this and there is no flag that fixes it, so fail fast with
# an actionable message instead of a wall of template errors. On Windows,
# build with MinGW-w64 (GCC); see the README "Windows" section.
if(MSVC)
  message(FATAL_ERROR
    "node-abieos cannot be built with MSVC. The bundled abieos library "
    "requires libstdc++/libc++ semantics that MSVC does not provide.\n"
    "On Windows, build with MinGW-w64 (GCC):\n"
    "  1. Install MSYS2, then: pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-ninja\n"
    "  2. Put <msys64>\\mingw64\\bin on PATH\n"
    "  3. npm run build:win")
endif()

add_definitions(-DNAPI_VERSION=10)

include_directories(${CMAKE_JS_INC})

set(default_build_type "Release")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS ON)

option(ABIEOS_NO_INT128 "disable use of __int128" OFF)
option(ABIEOS_ONLY_LIBRARY "define and build the ABIEOS library" OFF)

# macOS: build a universal2 (arm64 + x86_64) binary so one prebuilt runs on
# both Apple Silicon and Intel Macs. This lets CI produce the x64 artifact on
# the reliable Apple-Silicon runner (the Intel macos-13 runner is being
# retired). FORCE overrides the single-arch value cmake-js injects. Override
# with -DABIEOS_MAC_UNIVERSAL=OFF for a faster host-only dev build.
option(ABIEOS_MAC_UNIVERSAL "Build a macOS universal2 (arm64;x86_64) binary" ON)
if(APPLE AND ABIEOS_MAC_UNIVERSAL)
  set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "macOS universal2" FORCE)
endif()

if(NOT DEFINED SKIP_SUBMODULE_CHECK)
  # Portable presence check for the actual sources this build compiles.
  # The previous `git submodule status | grep -c` form shelled out to grep,
  # which is not available on Windows and broke configuration there.
  if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/abieos/src/abieos.cpp"
     OR NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/abieos/external/rapidjson/include")
     message(FATAL_ERROR "The 'abieos' submodule is not initialized.
Please run the command 'git submodule update --init --recursive'.")
  endif()
endif()

find_package(Threads)
include(GNUInstallDirs)

add_library(abieos STATIC abieos/src/abi.cpp abieos/src/crypto.cpp)
target_include_directories(abieos PUBLIC abieos/include abieos/external/rapidjson/include)

if(ABIEOS_NO_INT128)
target_compile_definitions(abieos PUBLIC ABIEOS_NO_INT128)
endif()

set_target_properties(abieos PROPERTIES POSITION_INDEPENDENT_CODE ON)

add_library(${PROJECT_NAME} SHARED src/main.cpp abieos/src/abieos.cpp)
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# --- Windows (MinGW-w64) Node-API delay-load --------------------------------
# cmake-js only emits the MSVC-format `node.lib` and the MSVC-only delay-load
# machinery (`/DELAYLOAD:NODE.EXE` + an `#ifdef _MSC_VER`-gated hook) when
# building with the MSVC toolset. Under MinGW we reproduce it with binutils:
#   * dlltool generates a *delay-import* library from the Node-API .def;
#   * src/win_delay_load_hook.cc (compiled in — cmake-js's copy is MSVC-only)
#     redirects the "node.exe" delay-load to the host process image.
# The result binds napi_* to whatever executable is running (node.exe,
# bun.exe, electron.exe, ...) instead of a file literally named node.exe.
if(WIN32 AND CMAKE_CXX_COMPILER_ID MATCHES "GNU")
  if(NOT CMAKE_JS_NODELIB_DEF OR NOT EXISTS "${CMAKE_JS_NODELIB_DEF}")
    message(FATAL_ERROR
      "CMAKE_JS_NODELIB_DEF not provided by cmake-js; cannot build the "
      "MinGW Node-API delay-import library.")
  endif()
  if(NOT CMAKE_DLLTOOL)
    set(CMAKE_DLLTOOL dlltool)
  endif()
  set(NODE_DELAYLIB "${CMAKE_BINARY_DIR}/libnode_api_delay.a")
  add_custom_command(
    OUTPUT "${NODE_DELAYLIB}"
    COMMAND "${CMAKE_DLLTOOL}" --input-def "${CMAKE_JS_NODELIB_DEF}"
            --dllname node.exe --output-delaylib "${NODE_DELAYLIB}"
    DEPENDS "${CMAKE_JS_NODELIB_DEF}"
    COMMENT "Generating MinGW Node-API delay-import library (-> host exe)"
    VERBATIM)
  add_custom_target(node_api_delaylib DEPENDS "${NODE_DELAYLIB}")
  add_dependencies(${PROJECT_NAME} node_api_delaylib)
  target_sources(${PROJECT_NAME} PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/src/win_delay_load_hook.cc")
  # Link the delay-import lib + binutils' delay-load helper (libdelayimp,
  # provides __delayLoadHelper2), in that order. Drop the missing MSVC
  # node.lib and strip only the MSVC-only /DELAYLOAD token cmake-js injects
  # (g++ would treat "/DELAYLOAD:NODE.EXE" as an input file) — keep any
  # other shared-linker flags from toolchains/presets/LDFLAGS intact.
  set(CMAKE_JS_LIB "${NODE_DELAYLIB};delayimp")
  string(REGEX REPLACE "/DELAYLOAD:[^ \t]*" ""
         CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS}")
  string(STRIP "${CMAKE_SHARED_LINKER_FLAGS}" CMAKE_SHARED_LINKER_FLAGS)
endif()

target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB};abieos;${CMAKE_THREAD_LIBS_INIT})
target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra -Wno-unused-parameter)

execute_process(COMMAND node -p "require('node-addon-api').include"
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
                OUTPUT_VARIABLE NODE_ADDON_API_DIR
                OUTPUT_STRIP_TRAILING_WHITESPACE)
# Strip CR (Windows `node` emits CRLF), LF and quotes so the path is usable.
string(REPLACE "\r" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")
string(REPLACE "\n" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")
string(REPLACE "\"" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")
target_include_directories(${PROJECT_NAME} PRIVATE "${NODE_ADDON_API_DIR}")

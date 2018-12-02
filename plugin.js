// Ignite CLI plugin for adding a splash screen

const PLUGIN_PATH = __dirname
const APP_PATH = process.cwd()

const add = async function(context) {
  const { filesystem, print, system } = context

  try {
    const spinner = print.spin()

    // patch splash screen
    spinner.text = `▸ setting up splash screen`
    spinner.start()
    spinner.text = `▸ setting up splash screen: configuring`

    // make sure we have a package.json
    if (!filesystem.exists(`${APP_PATH}/package.json`)) {
      throw new Error(`Couldn't find a package.json at ${APP_PATH}.`)
    }

    // grab the app name
    const { name } = filesystem.read(`${APP_PATH}/package.json`, 'json')

    // copy over local copies to use for patch
    const srcPatchPath = `${PLUGIN_PATH}/patches/splash-screen/splash-screen.patch`
    const patchPath = `${APP_PATH}/splash-screen.patch`
    filesystem.copy(srcPatchPath, patchPath)

    // iPhone X patch
    const srciPhoneXPatchPath = `${PLUGIN_PATH}/patches/splash-screen/iphonex-splash-screen.patch`
    const iphoneXPatchPath = `${APP_PATH}/iphonex-splash-screen.patch`
    filesystem.copy(srciPhoneXPatchPath, iphoneXPatchPath)

    // Grab the patches
    const patch = filesystem.read(patchPath)
    const iphoneXPatch = filesystem.read(iphoneXPatchPath)

    // Change some android configs in the main patch
    const androidOldMainPathRegex = new RegExp(
      '/android/app/src/main/java/com/SplashScreenPatch/MainActivity.java',
      'g'
    )
    const androidNewMainPath = `/android/app/src/main/java/com/${name.toLowerCase()}/MainActivity.java`
    const androidPatch = patch.replace(
      androidOldMainPathRegex,
      androidNewMainPath
    )

    // Replace placeholder name with this projects actual name
    const patchForNewProject = androidPatch.replace(/SplashScreenPatch/g, name)
    const iphoneXPatchForNewProject = iphoneXPatch.replace(
      /SplashScreenPatch/g,
      name
    )
    filesystem.write(patchPath, patchForNewProject)
    filesystem.write(iphoneXPatchPath, iphoneXPatchForNewProject)

    // if deleting, add the flag
    const rmFlag = context.removePatch ? '-R' : ''

    // Apply the patches
    const opts = { stdio: 'ignore' }
    await system.run(`git apply ${rmFlag} ${patchPath}`, opts)
    await system.run(`git apply ${rmFlag} ${iphoneXPatchPath}`, opts)

    // cleanup
    filesystem.delete(patchPath)
    filesystem.delete(iphoneXPatchPath)

    // done
    spinner.stop()
  } catch (e) {
    console.debug(e)
    process.exit(e.code)
  }
}

/**
 * Remove yourself from the project.
 */
const remove = async function(context) {
  // same thing as add, but set the "remove" flag
  context.removePatch = true
  await add(context)
}

// Required in all Ignite CLI plugins
module.exports = { add, remove }

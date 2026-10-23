// Stellt die Person auf einem Foto frei (macOS Vision, ohne Download) und schreibt ein PNG mit Transparenz.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers
let args = CommandLine.arguments
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("read fail"); exit(1) }
let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
do { try handler.perform([req]) } catch { print("vision fail", error); exit(1) }
guard let obs = req.results?.first else { print("no subject"); exit(1) }
print("instances", obs.allInstances.count)
var which = obs.allInstances
if args.count > 3 { which = IndexSet(args[3].split(separator: ",").compactMap { Int($0) }) }
let buf = try obs.generateMaskedImage(ofInstances: which, from: handler, croppedToInstancesExtent: false)
let ci = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
guard let out = ctx.createCGImage(ci, from: ci.extent) else { print("render fail"); exit(1) }
let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, out, nil); CGImageDestinationFinalize(dest)
print("ok", out.width, out.height)

const potrace = require("potrace");
const glob = require("glob");
const fs = require("fs-extra");
const path = require("path");
const sharp = require("sharp");

const images = glob.sync("./public/*.+(jpg|jpeg|png)");

images.forEach(async (image) => {
  const pathParts = path.parse(image);

  const resizedImagePath = `./images/resized-${pathParts.base}`;

  fs.ensureFileSync(resizedImagePath);

  await sharp(image)
    .resize({
      width: 400,
    })
    .toFile(resizedImagePath);

  potrace.posterize(
    resizedImagePath,
    {
      color: "rgba(99, 102, 241)",
      // threshold: 120,
      // turdSize: 120,
      // optTolerance: 4,
    },
    (err, svg) => {
      fs.writeFileSync(`./public/${pathParts.name}.svg`, svg);
    }
  );
});

export const WhatIsThis = () => {
  return (
    <section id="WhatIsIt" className="container text-center py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          What{" "}
        </span>{" "}
        is{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          this ?
        </span>
      </h2>

      <p className="md:w-3/4 mx-auto mt-4 mb-8 text-xl text-muted-foreground">
        I ask myself the same question every day
      </p>
      <div className="bg-muted/50 border rounded-lg py-12 space-y-8">
        <div className="px-6 flex flex-col gap-8 md:gap-12">
          <p className="text-xl text-muted-foreground mt-4">
            A whole app, because why not waste some time to make this assignment
            into a re-usable service, while learning more about what this job is
            about.
          </p>
          <p className="text-xl text-muted-foreground mt-4">
            So, here what i've built.
          </p>
        </div>
        <div className="px-6 flex flex-col md:flex-row gap-8 md:gap-12">
          <img src="/ver.png" className="w-full h-auto rounded-lg" />
        </div>
      </div>
    </section>
  );
};

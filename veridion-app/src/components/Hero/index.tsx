import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Linkedin } from "lucide-react";

export const Hero = () => {
  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold space-y-2">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#fcb241]  to-[#ffbb55] text-transparent bg-clip-text">
              I could have just scraped the websites and made an api
            </span>{" "}
            <span className="inline text-4xl bg-gradient-to-r from-[#007dd6] via-[#0091b9] to-[#59b4d8] text-transparent bg-clip-text">
              but you guys told me to deliver when i'm happy with what i've made
            </span>
          </h1>

          <h2>
            <span className="text-2xl block bg-gradient-to-r from-[#fffbf4] via-[#828282] to-[#d6cf00] text-transparent bg-clip-text">
              joke's on you
            </span>
            <span className="text-sm block bg-gradient-to-r from-[#F596D3]  to-[#D247BF] text-transparent bg-clip-text">
              i am heavily depressed
            </span>{" "}
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          But at least it was fun building this
        </p>
      </div>

      <Card className="w-fit flex flex-col justify-center items-center drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="mt-2 flex justify-center items-center">
          <img
            src="/hoolby.png"
            alt="user avatar"
            className="rounded-full w-32 h-32 aspect-square object-cover"
          />
          <CardTitle className="text-center">Andrei Holban</CardTitle>
          <CardDescription className="font-medium text-base text-primary text-center">
            I type and click to make computers go boop and beep
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center text-sm pb-2">
          <p>Please don't follow me on any of these</p>
        </CardContent>

        <CardFooter>
          <div>
            <a
              rel="noreferrer noopener"
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
              })}
            >
              <span className="sr-only">Github icon</span>
              <GitHubLogoIcon className="w-5 h-5" />
            </a>
            <a
              rel="noreferrer noopener"
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
              })}
            >
              <span className="sr-only">X icon</span>
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="fill-foreground w-5 h-5"
              >
                <title>X</title>
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
            </a>

            <a
              rel="noreferrer noopener"
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
              })}
            >
              <span className="sr-only">Linkedin icon</span>
              <Linkedin size="20" />
            </a>
          </div>
        </CardFooter>
      </Card>
      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};
